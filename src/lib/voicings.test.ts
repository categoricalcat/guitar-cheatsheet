import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Chord, Note } from 'tonal';
import { CHORD_TYPES, CHROMAS } from './theory.ts';
import { BOX_FRETS, SUFFIXES, TUNING, chordPositions, positions, voicing } from './voicings.ts';

const first = (symbol: string) => {
	const [position] = chordPositions(symbol);
	assert.ok(position, symbol);
	return voicing(position);
};

test('chords-db covers every chord type in standard tuning', () => {
	assert.deepEqual(TUNING, ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
	for (const { suffix } of CHORD_TYPES) assert.ok(SUFFIXES.includes(suffix), suffix);
});

test('open C maps strings high to low with finger numbers', () => {
	assert.deepEqual(first('C'), {
		position: 1,
		barres: [],
		fingers: [[6, 'x'], [5, 3, '3'], [4, 2, '2'], [3, 0], [2, 1, '1'], [1, 0]]
	});
});

test('F barre becomes one barre plus the fingers above it', () => {
	assert.deepEqual(first('F'), {
		position: 1,
		barres: [{ fret: 1, fromString: 6, toString: 1, text: '1' }],
		fingers: [[5, 3, '3'], [4, 3, '4'], [3, 2, '2']]
	});
});

test('wrong chords-db voicings are dropped', () => {
	assert.equal(positions(9, 'dim').length - chordPositions('Adim').length, 1);
	assert.equal(positions(1, 'aug').length - chordPositions('C#aug').length, 2);
});

test('every voicing of every root and chord type sounds only chord tones', () => {
	for (const chroma of CHROMAS) {
		for (const type of CHORD_TYPES) {
			const symbol = Note.pitchClass(Note.fromMidi(60 + chroma)) + type.symbol;
			const tones = new Set(Chord.get(symbol).notes.map(Note.chroma));
			const found = chordPositions(symbol);
			assert.ok(found.length > 0, symbol);
			for (const position of found) {
				for (const midi of position.midi) assert.ok(tones.has(midi % 12), `${symbol} midi ${midi}`);
				const { fingers, barres } = voicing(position);
				for (const [string, fret] of fingers) {
					assert.ok(string >= 1 && string <= TUNING.length, `${symbol} string ${string}`);
					assert.ok(fret === 'x' || fret <= BOX_FRETS, `${symbol} fret ${fret}`);
				}
				for (const barre of barres) assert.ok(barre.fromString > barre.toString, `${symbol} barre`);
			}
		}
	}
});
