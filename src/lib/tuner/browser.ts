import type { OpenInput, TunerHandle, TunerPort } from './controller.ts';
import type { TunerFailure, TunerResult } from './model.ts';

import { detector, FFT_SIZE } from './detector.ts';

export function createBrowserTunerPort(): TunerPort {
	return { enumerateInputs, openInput, watchInputs };
}

async function enumerateInputs(): Promise<TunerResult<readonly { readonly id: string; readonly label: string }[]>> {
	const media = mediaDevices();
	if (media === undefined) return unsupported();
	try {
		const devices = await media.enumerateDevices();
		return {
			tag: 'ok',
			value: devices.flatMap((device) =>
				device.kind === 'audioinput' && device.deviceId !== ''
					? [{ id: device.deviceId, label: device.label || device.deviceId }]
					: []
			)
		};
	} catch (error) {
		return { failure: failure(error), tag: 'error' };
	}
}

function failure(error: unknown): TunerFailure {
	if (error instanceof DOMException) {
		switch (error.name) {
			case 'NotAllowedError':
			case 'SecurityError':
				return { tag: 'permission-denied' };
			case 'NotFoundError':
			case 'NotReadableError':
			case 'OverconstrainedError':
				return { tag: 'device-unavailable' };
		}
	}
	return { message: error instanceof Error ? error.message : String(error), tag: 'unknown' };
}

function isMediaDevices(value: unknown): value is MediaDevices {
	return (
		typeof value === 'object' &&
		value !== null &&
		'enumerateDevices' in value &&
		typeof value.enumerateDevices === 'function' &&
		'getUserMedia' in value &&
		typeof value.getUserMedia === 'function'
	);
}

function mediaDevices(): MediaDevices | undefined {
	const media = Reflect.get(navigator, 'mediaDevices') as unknown;
	return isMediaDevices(media) ? media : undefined;
}

async function openInput({ deviceId, onReading, signal }: OpenInput): Promise<TunerResult<TunerHandle>> {
	const media = mediaDevices();
	if (media === undefined || typeof globalThis.AudioContext !== 'function') return unsupported();

	const context = new AudioContext();
	let frame: number | undefined;
	let stopped = false;
	let stream: MediaStream | undefined;

	const close = () => {
		stopped = true;
		signal.removeEventListener('abort', close);
		if (frame !== undefined) {
			cancelAnimationFrame(frame);
			frame = undefined;
		}
		for (const track of stream?.getTracks() ?? []) track.stop();
		stream = undefined;
		if (context.state !== 'closed') void context.close().catch(() => undefined);
	};

	signal.addEventListener('abort', close, { once: true });

	try {
		signal.throwIfAborted();
		if (context.state === 'suspended') await context.resume();
		signal.throwIfAborted();
		stream = await media.getUserMedia({
			audio: {
				autoGainControl: false,
				...(deviceId !== '' ? { deviceId: { exact: deviceId } } : {}),
				echoCancellation: false,
				noiseSuppression: false
			}
		});
		signal.throwIfAborted();

		const analyser = context.createAnalyser();
		analyser.fftSize = FFT_SIZE;
		context.createMediaStreamSource(stream).connect(analyser);
		const buffer = new Float32Array(analyser.fftSize);
		const detect = detector(buffer.length);

		frame = requestAnimationFrame(function tick() {
			if (stopped) return;
			analyser.getFloatTimeDomainData(buffer);
			onReading(detect(buffer, context.sampleRate));
			frame = requestAnimationFrame(tick);
		});
		return { tag: 'ok', value: { close } };
	} catch (error) {
		close();
		return { failure: failure(error), tag: 'error' };
	}
}

function unsupported<T>(): TunerResult<T> {
	return { failure: { tag: 'unsupported' }, tag: 'error' };
}

function watchInputs(onChange: () => void): () => void {
	const media = mediaDevices();
	if (media === undefined) return () => undefined;
	media.addEventListener('devicechange', onChange);
	return () => {
		media.removeEventListener('devicechange', onChange);
	};
}
