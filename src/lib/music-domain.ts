export const CHROMAS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
export type Chroma = (typeof CHROMAS)[number];

export const SCALES = [
	'major',
	'minor',
	'harmonic minor',
	'melodic minor',
	'major pentatonic',
	'minor pentatonic',
	'minor blues'
] as const;
export type ScaleName = (typeof SCALES)[number];

export const MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] as const;
export type ModeName = (typeof MODES)[number];

export type MusicScale = ModeName | ScaleName;
export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export function modChroma(value: number): Chroma {
	if (!Number.isFinite(value)) throw new RangeError(`Cannot normalize non-finite chroma: ${String(value)}`);
	const normalized = ((Math.trunc(value) % CHROMAS.length) + CHROMAS.length) % CHROMAS.length;
	const chroma = CHROMAS[normalized];
	if (chroma === undefined) throw new RangeError(`Invalid normalized chroma: ${String(normalized)}`);
	return chroma;
}
