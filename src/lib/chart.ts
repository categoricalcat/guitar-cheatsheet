import type { Attachment } from 'svelte/attachments';

import { type Chord, type ChordSettings, Orientation, SVGuitarChord } from 'svguitar';
import { Note } from 'tonal';

import { FRETS } from './fretboard.ts';
import { BOX_FRETS, TUNING } from './voicings.ts';

const THEME: ChordSettings = { color: 'currentColor', fontFamily: 'Maple Mono, monospace' };

export const BOX: ChordSettings = { ...THEME, frets: BOX_FRETS };

export const NECK: ChordSettings = {
	...THEME,
	fretMarkers: [2, 4, 6, 8, { double: true, fret: 11 }],
	frets: FRETS,
	noPosition: true,
	orientation: Orientation.horizontal,
	tuning: TUNING.map(Note.pitchClass)
};

export const chart =
	(chord: Chord, settings: ChordSettings): Attachment<HTMLElement> =>
	(node) => {
		const diagram = new SVGuitarChord(node).configure(settings).chord(chord);
		diagram.draw();
		return () => {
			diagram.remove();
		};
	};
