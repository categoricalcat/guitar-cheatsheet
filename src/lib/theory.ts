import { Chord, ChordType, Interval, Key, Mode, Note, Progression, RomanNumeral, Scale } from 'tonal';

import {
	type Chroma,
	CHROMAS,
	modChroma,
	MODES,
	type MusicScale,
	type NonEmptyReadonlyArray,
	SCALES
} from './music-domain.ts';

export { CHROMAS, MODES, SCALES };
export type { Chroma, MusicScale };

type Quality = ReturnType<typeof Chord.get>['quality'];

export const ROOT_CHORD_TYPES = [
	{ suffix: 'major', symbol: '' },
	{ suffix: 'minor', symbol: 'm' },
	{ suffix: '7', symbol: '7' },
	{ suffix: 'maj7', symbol: 'maj7' },
	{ suffix: 'm7', symbol: 'm7' },
	{ suffix: 'm7b5', symbol: 'm7b5' },
	{ suffix: 'dim', symbol: 'dim' },
	{ suffix: 'dim7', symbol: 'dim7' },
	{ suffix: 'aug', symbol: 'aug' },
	{ suffix: 'sus2', symbol: 'sus2' },
	{ suffix: 'sus4', symbol: 'sus4' },
	{ suffix: '6', symbol: '6' },
	{ suffix: 'm6', symbol: 'm6' },
	{ suffix: '9', symbol: '9' },
	{ suffix: 'add9', symbol: 'add9' }
] as const;

// harmonic/melodic minor harmonise into these as well
export const CHORD_TYPES = [
	...ROOT_CHORD_TYPES,
	{ suffix: 'mmaj7', symbol: 'mMaj7' },
	{ suffix: 'maj7#5', symbol: 'maj7#5' }
] as const;

type ChordTypeEntry = (typeof CHORD_TYPES)[number];

type ProgressionDefinition = {
	readonly name: string;
	readonly numerals: NonEmptyReadonlyArray<string>;
	readonly tonality: 'major' | 'minor';
};

export const PROGRESSIONS = [
	{ name: 'Three-chord', numerals: ['I', 'IV', 'V'], tonality: 'major' },
	{ name: 'Pop', numerals: ['I', 'V', 'vi', 'IV'], tonality: 'major' },
	{ name: 'Doo-wop', numerals: ['I', 'vi', 'IV', 'V'], tonality: 'major' },
	{ name: 'Jazz', numerals: ['ii7', 'V7', 'Imaj7'], tonality: 'major' },
	{
		name: '12-bar blues',
		numerals: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
		tonality: 'major'
	},
	{ name: 'Minor three-chord', numerals: ['i', 'iv', 'v'], tonality: 'minor' },
	{ name: 'Epic', numerals: ['i', 'bVI', 'bIII', 'bVII'], tonality: 'minor' },
	{ name: 'Andalusian', numerals: ['i', 'bVII', 'bVI', 'V'], tonality: 'minor' },
	{ name: 'Minor jazz', numerals: ['iiø7', 'V7', 'i7'], tonality: 'minor' }
] as const satisfies readonly ProgressionDefinition[];

export const pretty = (symbol: string): string => symbol.replaceAll('#', '♯').replaceAll('b', '♭');

type ScaleDescription = {
	readonly formula: readonly string[];
	readonly notes: readonly string[];
};

// Sharp first so it wins accidental-count ties (F# over Gb major).
function spellings(chroma: Chroma): NonEmptyReadonlyArray<string> {
	const sharp = Note.pitchClass(Note.fromMidiSharps(60 + chroma));
	const flat = Note.pitchClass(Note.fromMidi(60 + chroma));
	return sharp === flat ? [sharp] : [sharp, flat];
}

function zipExact<A, B>(as: readonly A[], bs: readonly B[]): readonly (readonly [A, B])[] {
	if (as.length !== bs.length)
		throw new Error(`Cannot zip arrays of lengths ${String(as.length)} and ${String(bs.length)}`);
	return as.map((a, index) => {
		const b = bs[index];
		if (b === undefined) throw new Error(`Missing item at index ${String(index)}`);
		return [a, b] as const;
	});
}

export const rootLabel = (chroma: Chroma): string => spellings(chroma).map(pretty).join('/');

const accidentals = (tonic: string, scale: MusicScale): number =>
	Scale.get(`${tonic} ${scale}`).notes.reduce((sum, note) => sum + Math.abs(Note.get(note).alt), 0);

export const spell = (chroma: Chroma, scale: MusicScale): string =>
	spellings(chroma).reduce((best, name) => (accidentals(name, scale) < accidentals(best, scale) ? name : best));

export function degree(interval: string): string {
	const parsed = Interval.get(interval);
	if (parsed.empty) throw new Error(`Invalid interval: ${interval}`);
	return `${parsed.alt < 0 ? 'b'.repeat(-parsed.alt) : '#'.repeat(parsed.alt)}${String(parsed.num)}`;
}

const describe = ({
	intervals,
	notes
}: {
	readonly intervals: readonly string[];
	readonly notes: readonly string[];
}): ScaleDescription => ({ formula: intervals.map(degree), notes: [...notes] });

export const scaleInfo = (tonic: string, scale: MusicScale): ScaleDescription =>
	describe(Scale.get(`${tonic} ${scale}`));

export const chordInfo = (symbol: string): ScaleDescription => describe(Chord.get(symbol));

export const chordType = (symbol: string): ChordTypeEntry | undefined => {
	const { setNum } = Chord.get(symbol);
	return CHORD_TYPES.find((type) => ChordType.get(type.symbol).setNum === setNum);
};

export const noteMarks = (notes: readonly string[]): ReadonlyMap<Chroma, string> =>
	new Map(notes.map((note) => [modChroma(Note.chroma(note)), pretty(note)]));

export const intervalMarks = (root: Chroma): ReadonlyMap<Chroma, string> =>
	new Map(CHROMAS.map((step) => [modChroma(root + step), pretty(degree(Interval.fromSemitones(step)))]));

export const signature = (keySignature: string): string =>
	keySignature.length > 0 ? `${String(keySignature.length)}${pretty(keySignature.charAt(0))}` : '0';

export type KeyInfo = {
	readonly dominant: string;
	readonly keySignature: string;
	readonly name: string;
	readonly parallel: string;
	readonly relative: string;
	readonly subdominant: string;
};

export function keyInfo(chroma: Chroma): readonly KeyInfo[] {
	const major = Key.majorKey(spell(chroma, 'major'));
	const minor = Key.minorKey(spell(chroma, 'minor'));
	return [
		keyRow(major.tonic, '', major.keySignature, `${major.minorRelative}m`),
		keyRow(minor.tonic, 'm', minor.keySignature, minor.relativeMajor)
	];
}

function keyRow(tonic: string, suffix: '' | 'm', keySignature: string, relative: string): KeyInfo {
	return {
		dominant: Note.transposeFifths(tonic, 1) + suffix,
		keySignature,
		name: tonic + suffix,
		parallel: tonic + (suffix.length > 0 ? '' : 'm'),
		relative,
		subdominant: Note.transposeFifths(tonic, -1) + suffix
	};
}

const MINOR_KEY_VARIANT: ReadonlyMap<MusicScale, 'harmonic' | 'melodic'> = new Map([
	['harmonic minor', 'harmonic'],
	['melodic minor', 'melodic']
]);

function harmonize(tonic: string, scale: MusicScale): readonly (readonly [string, string])[] | undefined {
	const variant = MINOR_KEY_VARIANT.get(scale);
	if (variant !== undefined) {
		const { chords, triads } = Key.minorKey(tonic)[variant];
		return zipExact(triads, chords);
	}
	return Mode.get(scale).empty ? undefined : zipExact(Mode.triads(scale, tonic), Mode.seventhChords(scale, tonic));
}

const NUMERAL_CASE: Record<Quality, (roman: string) => string> = {
	Augmented: (roman) => `${roman}+`,
	Diminished: (roman) => `${roman.toLowerCase()}°`,
	Major: (roman) => roman,
	Minor: (roman) => roman.toLowerCase(),
	Unknown: (roman) => roman
};

export type DiatonicRow = {
	readonly numeral: string;
	readonly seventh: string;
	readonly triad: string;
};

export type Harmony =
	{ readonly rows: readonly DiatonicRow[]; readonly tag: 'available' } | { readonly tag: 'not-applicable' };

export function diatonic(tonic: string, scale: MusicScale): Harmony {
	const chords = harmonize(tonic, scale);
	return chords === undefined
		? { tag: 'not-applicable' }
		: {
				rows: chords.map(([triad, seventh]) => ({ numeral: numeral(tonic, triad), seventh, triad })),
				tag: 'available'
			};
}

function numeral(tonic: string, chord: string): string {
	const { quality, tonic: root } = Chord.get(chord);
	const { name } = RomanNumeral.get(Interval.get(Interval.distance(tonic, root ?? tonic)));
	return name.replace(/[IV]+/, NUMERAL_CASE[quality]);
}

const MINOR_SUFFIX = new Map([
	['7', 'm7'],
	['', 'm'],
	['°7', 'dim7'],
	['°', 'dim'],
	['ø7', 'm7b5']
]);

// Tonal reads chord quality from the suffix only, so lowercase numerals need an explicit minor suffix
function toTonal(numeral: string): string {
	const [, acc = '', roman = '', suffix = ''] = /^([b#]*)([iv]+)(.*)$/.exec(numeral) ?? [];
	return roman.length > 0 ? acc + roman.toUpperCase() + (MINOR_SUFFIX.get(suffix) ?? `m${suffix}`) : numeral;
}

export const progression = (tonic: string, numerals: readonly string[]): readonly string[] =>
	Progression.fromRomanNumerals(tonic, numerals.map(toTonal));
