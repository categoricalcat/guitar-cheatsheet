import guitar from '@tombatossals/chords-db/lib/guitar.json' with { type: 'json' };
import type { Barre, Chord, Finger } from 'svguitar';
import { Chord as TonalChord, Note } from 'tonal';
import { chordType } from './theory.ts';

type Position = {
	readonly frets: readonly number[];
	readonly fingers: readonly number[];
	readonly baseFret: number;
	readonly barres: readonly number[];
	readonly midi: readonly number[];
};

type Db = {
	readonly tunings: { readonly standard: readonly string[] };
	readonly keys: readonly string[];
	readonly suffixes: readonly string[];
	readonly chords: Readonly<Record<string, readonly { readonly suffix: string; readonly positions: readonly Position[] }[]>>;
};

const db: Db = guitar;

export const TUNING = db.tunings.standard;
export const SUFFIXES = db.suffixes;
export const BOX_FRETS = 4;

// chords-db lists strings low to high; svguitar numbers them high (1) to low (6)
export const stringOf = (index: number): number => TUNING.length - index;

export const positions = (chroma: number, suffix: string): readonly Position[] =>
	db.chords[db.keys[chroma]?.replace('#', 'sharp') ?? '']?.find((chord) => chord.suffix === suffix)?.positions ?? [];

type Span = { readonly fret: number; readonly finger: number; readonly first: number; readonly last: number };

const count = (values: readonly number[], value: number): number => values.filter((v) => v === value).length;

// chords-db only gives the barre fret; the barre finger is the one repeated on that fret
function span(frets: readonly number[], fingers: readonly number[], fret: number): Span[] {
	const strings = frets.flatMap((f, i) => (f === fret ? [i] : []));
	const used = strings.map((i) => fingers[i] ?? 0);
	const finger = used.reduce((best, f) => (count(used, f) > count(used, best) ? f : best), 0);
	const covered = strings.filter((i) => fingers[i] === finger);
	const first = Math.min(...covered);
	const last = Math.max(...covered);
	const playable = frets.slice(first, last + 1).every((f) => f < 0 || f >= fret);
	return finger > 0 && covered.length > 1 && playable ? [{ fret, finger, first, last }] : [];
}

export function voicing({ frets, fingers, baseFret, barres }: Position): Chord {
	const spans = barres.flatMap((fret) => span(frets, fingers, fret));
	const barred = (fret: number, i: number) =>
		spans.some((s) => s.fret === fret && s.finger === fingers[i] && i >= s.first && i <= s.last);
	return {
		position: baseFret,
		barres: spans.map(
			({ fret, finger, first, last }): Barre => ({
				fret,
				fromString: stringOf(first),
				toString: stringOf(last),
				text: String(finger)
			})
		),
		fingers: frets.flatMap((fret, i): Finger[] => {
			const string = stringOf(i);
			if (fret < 0) return [[string, 'x']];
			if (fret === 0) return [[string, 0]];
			if (barred(fret, i)) return [];
			const finger = fingers[i] ?? 0;
			return [finger > 0 ? [string, fret, String(finger)] : [string, fret]];
		})
	};
}

// a few chords-db voicings are wrong (e.g. its Adim sounds A C B D), so keep only those sounding chord tones
export function chordPositions(symbol: string): readonly Position[] {
	const type = chordType(symbol);
	const { tonic, notes } = TonalChord.get(symbol);
	if (!type || !tonic) return [];
	const tones = new Set(notes.map(Note.chroma));
	return positions(Note.chroma(tonic), type.suffix).filter(({ midi }) => midi.every((m) => tones.has(m % 12)));
}
