import { PitchDetector } from 'pitchy';
import { Midi } from 'tonal';

export type Reading = { readonly note: string; readonly cents: number; readonly hz: number };

export const FFT_SIZE = 4096;
const CLARITY = 0.9;
// drop-B low string (~62 Hz) up to the 24th fret of the high E (~1319 Hz)
const MIN_HZ = 60;
const MAX_HZ = 1400;

export function reading(hz: number): Reading {
	const midi = Midi.freqToMidi(hz);
	const nearest = Math.round(midi);
	return { note: Midi.midiToNoteName(nearest, { sharps: true }), cents: Math.round((midi - nearest) * 100), hz };
}

export function detector(size: number) {
	const pitch = PitchDetector.forFloat32Array(size);
	return (buffer: Float32Array, sampleRate: number): Reading | undefined => {
		const [hz, clarity] = pitch.findPitch(buffer, sampleRate);
		return clarity >= CLARITY && hz >= MIN_HZ && hz <= MAX_HZ ? reading(hz) : undefined;
	};
}

export const inputs = async (): Promise<MediaDeviceInfo[]> =>
	((await navigator.mediaDevices?.enumerateDevices()) ?? []).filter(
		(device) => device.kind === 'audioinput' && device.deviceId !== ''
	);

export async function listen(deviceId: string, onReading: (reading: Reading) => void): Promise<() => void> {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			...(deviceId ? { deviceId: { exact: deviceId } } : {}),
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false
		}
	});
	const context = new AudioContext();
	const analyser = new AnalyserNode(context, { fftSize: FFT_SIZE });
	context.createMediaStreamSource(stream).connect(analyser);
	const buffer = new Float32Array(analyser.fftSize);
	const detect = detector(buffer.length);
	let frame = requestAnimationFrame(function tick() {
		analyser.getFloatTimeDomainData(buffer);
		const result = detect(buffer, context.sampleRate);
		if (result) onReading(result);
		frame = requestAnimationFrame(tick);
	});
	return () => {
		cancelAnimationFrame(frame);
		for (const track of stream.getTracks()) track.stop();
		void context.close();
	};
}
