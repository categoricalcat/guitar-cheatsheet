import { Chord, ChordType, Interval, Key, Mode, Note, Progression, RomanNumeral, Scale } from 'tonal';

type Quality = ReturnType<typeof Chord.get>['quality'];

export const SCALES = [
	'major',
	'minor',
	'harmonic minor',
	'melodic minor',
	'major pentatonic',
	'minor pentatonic',
	'minor blues'
] as const;

export const MODES = Mode.names();

export const CHROMAS = Array.from({ length: 12 }, (_, chroma) => chroma);

export const ROOT_CHORD_TYPES = [
	{ symbol: '', suffix: 'major' },
	{ symbol: 'm', suffix: 'minor' },
	{ symbol: '7', suffix: '7' },
	{ symbol: 'maj7', suffix: 'maj7' },
	{ symbol: 'm7', suffix: 'm7' },
	{ symbol: 'm7b5', suffix: 'm7b5' },
	{ symbol: 'dim', suffix: 'dim' },
	{ symbol: 'dim7', suffix: 'dim7' },
	{ symbol: 'aug', suffix: 'aug' },
	{ symbol: 'sus2', suffix: 'sus2' },
	{ symbol: 'sus4', suffix: 'sus4' },
	{ symbol: '6', suffix: '6' },
	{ symbol: 'm6', suffix: 'm6' },
	{ symbol: '9', suffix: '9' },
	{ symbol: 'add9', suffix: 'add9' }
] as const;

// harmonic/melodic minor harmonise into these as well
export const CHORD_TYPES = [
	...ROOT_CHORD_TYPES,
	{ symbol: 'mMaj7', suffix: 'mmaj7' },
	{ symbol: 'maj7#5', suffix: 'maj7#5' }
] as const;

type ChordTypeEntry = (typeof CHORD_TYPES)[number];

export const PROGRESSIONS = [
	{ name: 'Three-chord', tonality: 'major', numerals: ['I', 'IV', 'V'] },
	{ name: 'Pop', tonality: 'major', numerals: ['I', 'V', 'vi', 'IV'] },
	{ name: 'Doo-wop', tonality: 'major', numerals: ['I', 'vi', 'IV', 'V'] },
	{ name: 'Jazz', tonality: 'major', numerals: ['ii7', 'V7', 'Imaj7'] },
	{
		name: '12-bar blues',
		tonality: 'major',
		numerals: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7']
	},
	{ name: 'Minor three-chord', tonality: 'minor', numerals: ['i', 'iv', 'v'] },
	{ name: 'Epic', tonality: 'minor', numerals: ['i', 'bVI', 'bIII', 'bVII'] },
	{ name: 'Andalusian', tonality: 'minor', numerals: ['i', 'bVII', 'bVI', 'V'] },
	{ name: 'Minor jazz', tonality: 'minor', numerals: ['iiø7', 'V7', 'i7'] }
] as const;

export const pretty = (symbol: string): string => symbol.replaceAll('#', '♯').replaceAll('b', '♭');

const zip = <A, B>(as: readonly A[], bs: readonly B[]): [A, B][] =>
	as.flatMap((a, i): [A, B][] => {
		const b = bs[i];
		return b === undefined ? [] : [[a, b]];
	});

// sharp first so it wins ties (F# over Gb major)
const spellings = (chroma: number): string[] => [
	...new Set([Note.fromMidiSharps(60 + chroma), Note.fromMidi(60 + chroma)].map(Note.pitchClass))
];

export const rootLabel = (chroma: number): string => spellings(chroma).map(pretty).join('/');

const accidentals = (tonic: string, scale: string): number =>
	Scale.get(`${tonic} ${scale}`).notes.reduce((sum, note) => sum + Math.abs(Note.get(note).alt ?? 0), 0);

export const spell = (chroma: number, scale: string): string =>
	spellings(chroma).reduce((best, name) =>
		accidentals(name, scale) < accidentals(best, scale) ? name : best
	);

export function degree(interval: string): string {
	const { num = 0, alt = 0 } = Interval.get(interval);
	return (alt < 0 ? 'b'.repeat(-alt) : '#'.repeat(alt)) + num;
}

const describe = ({ notes, intervals }: { notes: string[]; intervals: string[] }) => ({
	notes,
	formula: intervals.map(degree)
});

export const scaleInfo = (tonic: string, scale: string) => describe(Scale.get(`${tonic} ${scale}`));

export const chordInfo = (symbol: string) => describe(Chord.get(symbol));

export const chordType = (symbol: string): ChordTypeEntry | undefined => {
	const { setNum } = Chord.get(symbol);
	return CHORD_TYPES.find((type) => ChordType.get(type.symbol).setNum === setNum);
};

export const noteMarks = (notes: readonly string[]): Map<number, string> =>
	new Map(notes.map((note) => [Note.chroma(note), pretty(note)]));

export const intervalMarks = (root: number): Map<number, string> =>
	new Map(CHROMAS.map((step) => [(root + step) % 12, pretty(degree(Interval.fromSemitones(step)))]));

export const signature = (keySignature: string): string =>
	keySignature ? `${keySignature.length}${pretty(keySignature.charAt(0))}` : '0';

export function keyInfo(chroma: number) {
	const major = Key.majorKey(spell(chroma, 'major'));
	const minor = Key.minorKey(spell(chroma, 'minor'));
	return [
		{ tonic: major.tonic, suffix: '', keySignature: major.keySignature, relative: `${major.minorRelative}m` },
		{ tonic: minor.tonic, suffix: 'm', keySignature: minor.keySignature, relative: minor.relativeMajor }
	].map(({ tonic, suffix, ...key }) => ({
		...key,
		name: tonic + suffix,
		subdominant: Note.transposeFifths(tonic, -1) + suffix,
		dominant: Note.transposeFifths(tonic, 1) + suffix
	}));
}

const MINOR_KEY_VARIANT = new Map<string, 'harmonic' | 'melodic'>([
	['harmonic minor', 'harmonic'],
	['melodic minor', 'melodic']
]);

function harmonize(tonic: string, scale: string): [string, string][] {
	const variant = MINOR_KEY_VARIANT.get(scale);
	if (variant) {
		const { triads, chords } = Key.minorKey(tonic)[variant];
		return zip(triads, chords);
	}
	return Mode.get(scale).empty ? [] : zip(Mode.triads(scale, tonic), Mode.seventhChords(scale, tonic));
}

const NUMERAL_CASE: Record<Quality, (roman: string) => string> = {
	Major: (roman) => roman,
	Minor: (roman) => roman.toLowerCase(),
	Diminished: (roman) => `${roman.toLowerCase()}°`,
	Augmented: (roman) => `${roman}+`,
	Unknown: (roman) => roman
};

function numeral(tonic: string, chord: string): string {
	const { tonic: root, quality } = Chord.get(chord);
	const { name } = RomanNumeral.get(Interval.get(Interval.distance(tonic, root ?? tonic)));
	return name.replace(/[IV]+/, NUMERAL_CASE[quality]);
}

export const diatonic = (tonic: string, scale: string) =>
	harmonize(tonic, scale).map(([triad, seventh]) => ({ numeral: numeral(tonic, triad), triad, seventh }));

const MINOR_SUFFIX = new Map([
	['', 'm'],
	['7', 'm7'],
	['ø7', 'm7b5'],
	['°', 'dim'],
	['°7', 'dim7']
]);

// Tonal reads chord quality from the suffix only, so lowercase numerals need an explicit minor suffix
function toTonal(numeral: string): string {
	const [, acc = '', roman = '', suffix = ''] = /^([b#]*)([iv]+)(.*)$/.exec(numeral) ?? [];
	return roman ? acc + roman.toUpperCase() + (MINOR_SUFFIX.get(suffix) ?? `m${suffix}`) : numeral;
}

export const progression = (tonic: string, numerals: readonly string[]): string[] =>
	Progression.fromRomanNumerals(tonic, numerals.map(toTonal));
