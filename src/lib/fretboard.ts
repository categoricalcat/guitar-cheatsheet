import type { Chord, Finger } from 'svguitar';

import { Note } from 'tonal';

import { type Chroma, modChroma } from './music-domain.ts';
import { stringOf, TUNING } from './voicings.ts';

export const FRETS = 12;

const FRET_RANGE = Array.from({ length: FRETS + 1 }, (_, fret) => fret);

export function neck(marks: ReadonlyMap<Chroma, string>, root: Chroma): Chord {
	return {
		barres: [],
		fingers: TUNING.flatMap((open, index) =>
			FRET_RANGE.flatMap((fret): Finger[] => {
				const chroma = modChroma(Note.chroma(open) + fret);
				const text = marks.get(chroma);
				if (text === undefined) return [];
				const string = stringOf(index);
				const isRoot = chroma === root;
				if (fret === 0) {
					const color = isRoot ? 'var(--accent)' : 'currentColor';
					return [[string, 0, { strokeColor: color, text, textColor: color }]];
				}
				return [[string, fret, { className: isRoot ? 'root' : 'note', text }]];
			})
		)
	};
}
