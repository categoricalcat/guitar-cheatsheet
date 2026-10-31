import { PitchDetector } from 'pitchy';
import { Midi } from 'tonal';

export type Reading = {
	readonly cents: number;
	readonly hz: number;
	readonly note: string;
};

export const FFT_SIZE = 4096;
export const MIN_HZ = 60;
export const MAX_HZ = 1400;
const CLARITY = 0.9;

export function reading(hz: number): Reading {
	const midi = Midi.freqToMidi(hz);
	const nearest = Math.round(midi);
	return {
		cents: Math.round((midi - nearest) * 100),
		hz,
		note: Midi.midiToNoteName(nearest, { sharps: true })
	};
}

export const isGuitarPitch = (hz: number): boolean => hz >= MIN_HZ && hz <= MAX_HZ;

export function detector(size: number): (buffer: Readonly<Float32Array>, sampleRate: number) => Reading | undefined {
	const pitch = PitchDetector.forFloat32Array(size);
	return (buffer, sampleRate) => {
		const [hz, clarity] = pitch.findPitch(buffer, sampleRate);
		return clarity >= CLARITY && isGuitarPitch(hz) ? reading(hz) : undefined;
	};
}
