import type { Attachment } from 'svelte/attachments';
import { Orientation, SVGuitarChord, type Chord, type ChordSettings } from 'svguitar';
import { Note } from 'tonal';
import { FRETS } from './fretboard.ts';
import { BOX_FRETS, TUNING } from './voicings.ts';

const THEME: ChordSettings = { color: 'currentColor', fontFamily: 'system-ui, sans-serif' };

export const BOX: ChordSettings = { ...THEME, frets: BOX_FRETS };

export const NECK: ChordSettings = {
	...THEME,
	orientation: Orientation.horizontal,
	frets: FRETS,
	noPosition: true,
	tuning: TUNING.map(Note.pitchClass),
	fretMarkers: [2, 4, 6, 8, { fret: 11, double: true }]
};

export const chart =
	(chord: Chord, settings: ChordSettings): Attachment<HTMLElement> =>
	(node) => {
		const diagram = new SVGuitarChord(node).configure(settings).chord(chord);
		diagram.draw();
		return () => diagram.remove();
	};
