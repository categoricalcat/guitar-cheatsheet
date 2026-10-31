import type { Barre, Chord, Finger } from 'svguitar';

import guitar from '@tombatossals/chords-db/lib/guitar.json' with { type: 'json' };
import { Note, Chord as TonalChord } from 'tonal';

import { type Chroma, modChroma } from './music-domain.ts';
import { chordType } from './theory.ts';

type Db = {
	readonly chords: Readonly<
		Record<string, readonly { readonly positions: readonly Position[]; readonly suffix: string }[]>
	>;
	readonly keys: readonly string[];
	readonly suffixes: readonly string[];
	readonly tunings: { readonly standard: readonly string[] };
};

type Position = {
	readonly barres: readonly number[];
	readonly baseFret: number;
	readonly fingers: readonly number[];
	readonly frets: readonly number[];
	readonly midi: readonly number[];
};

const db: Db = guitar;

export const TUNING = db.tunings.standard;
export const SUFFIXES = db.suffixes;
export const BOX_FRETS = 4;

// chords-db lists strings low to high; svguitar numbers them high (1) to low (6)
export const stringOf = (index: number): number => TUNING.length - index;

export const positions = (chroma: Chroma, suffix: string): readonly Position[] =>
	db.chords[db.keys[chroma]?.replace('#', 'sharp') ?? '']?.find((chord) => chord.suffix === suffix)?.positions ?? [];

type Span = { readonly finger: number; readonly first: number; readonly fret: number; readonly last: number };

const count = (values: readonly number[], value: number): number => values.filter((v) => v === value).length;

// a few chords-db voicings are wrong (e.g. its Adim sounds A C B D), so keep only those sounding chord tones
export function chordPositions(symbol: string): readonly Position[] {
	const type = chordType(symbol);
	const { notes, tonic } = TonalChord.get(symbol);
	if (type === undefined || tonic === null) return [];
	const tones = new Set(notes.map((note) => modChroma(Note.chroma(note))));
	return positions(modChroma(Note.chroma(tonic)), type.suffix).filter(({ midi }) =>
		midi.every((m) => tones.has(modChroma(m)))
	);
}

export function voicing({ barres, baseFret, fingers, frets }: Position): Chord {
	const spans = barres.flatMap((fret) => span(frets, fingers, fret));
	const barred = (fret: number, i: number) =>
		spans.some((s) => s.fret === fret && s.finger === fingers[i] && i >= s.first && i <= s.last);
	return {
		barres: spans.map(({ finger, first, fret, last }): Barre => ({
			fret,
			fromString: stringOf(first),
			text: String(finger),
			toString: stringOf(last)
		})),
		fingers: frets.flatMap((fret, i): Finger[] => {
			const string = stringOf(i);
			if (fret < 0) return [[string, 'x']];
			if (fret === 0) return [[string, 0]];
			if (barred(fret, i)) return [];
			const finger = fingers[i] ?? 0;
			return [finger > 0 ? [string, fret, String(finger)] : [string, fret]];
		}),
		position: baseFret
	};
}

// chords-db only gives the barre fret; the barre finger is the one repeated on that fret
function span(frets: readonly number[], fingers: readonly number[], fret: number): Span[] {
	const strings = frets.flatMap((f, i) => (f === fret ? [i] : []));
	const used = strings.map((i) => fingers[i] ?? 0);
	const finger = used.reduce((best, f) => (count(used, f) > count(used, best) ? f : best), 0);
	const covered = strings.filter((i) => fingers[i] === finger);
	const first = Math.min(...covered);
	const last = Math.max(...covered);
	const playable = frets.slice(first, last + 1).every((f) => f < 0 || f >= fret);
	return finger > 0 && covered.length > 1 && playable ? [{ finger, first, fret, last }] : [];
}
