import type { Chord, Finger } from 'svguitar';
import { Note } from 'tonal';
import { TUNING, stringOf } from './voicings.ts';

export const FRETS = 12;

const FRET_RANGE = Array.from({ length: FRETS + 1 }, (_, fret) => fret);

export function neck(marks: ReadonlyMap<number, string>, root: number): Chord {
	return {
		barres: [],
		fingers: TUNING.flatMap((open, index) =>
			FRET_RANGE.flatMap((fret): Finger[] => {
				const chroma = (Note.chroma(open) + fret) % 12;
				const text = marks.get(chroma);
				if (text === undefined) return [];
				const string = stringOf(index);
				return [fret === 0 ? [string, 0] : [string, fret, { text, className: chroma === root ? 'root' : 'note' }]];
			})
		)
	};
}
