import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChordType, Mode, Note } from 'tonal';

import {
	CHORD_TYPES,
	chordInfo,
	chordType,
	CHROMAS,
	degree,
	diatonic,
	type DiatonicRow,
	intervalMarks,
	keyInfo,
	MODES,
	type MusicScale,
	noteMarks,
	pretty,
	progression,
	PROGRESSIONS,
	rootLabel,
	scaleInfo,
	SCALES,
	signature,
	spell
} from './theory.ts';

const HEPTATONIC = [
	'major',
	'minor',
	'harmonic minor',
	'melodic minor',
	...MODES
] as const satisfies readonly MusicScale[];

function availableRows(tonic: string, scale: MusicScale): readonly DiatonicRow[] {
	const harmony = diatonic(tonic, scale);
	if (harmony.tag !== 'available') assert.fail(`${tonic} ${scale} is not harmonizable`);
	return harmony.rows;
}

void test('chord types are known to Tonal and distinct', () => {
	const setNums = CHORD_TYPES.map(({ symbol }) => {
		const type = ChordType.get(symbol);
		assert.equal(type.empty, false, symbol);
		return type.setNum;
	});
	assert.equal(new Set(setNums).size, CHORD_TYPES.length);
});

void test('roots are spelled with the fewest accidentals for the scale', () => {
	assert.equal(spell(1, 'major'), 'Db');
	assert.equal(spell(1, 'minor'), 'C#');
	assert.equal(spell(6, 'major'), 'F#');
	assert.equal(spell(3, 'major'), 'Eb');
	assert.equal(spell(8, 'minor'), 'G#');
	assert.equal(spell(10, 'dorian'), 'Bb');
	assert.equal(spell(1, 'minor blues'), 'C#');
	assert.deepEqual(CHROMAS.map(rootLabel), [
		'C',
		'C♯/D♭',
		'D',
		'D♯/E♭',
		'E',
		'F',
		'F♯/G♭',
		'G',
		'G♯/A♭',
		'A',
		'A♯/B♭',
		'B'
	]);
});

void test('formulas use scale-degree labels', () => {
	assert.deepEqual(scaleInfo('C', 'minor blues'), {
		formula: ['1', 'b3', '4', 'b5', '5', 'b7'],
		notes: ['C', 'Eb', 'F', 'Gb', 'G', 'Bb']
	});
	assert.deepEqual(chordInfo('Cdim7').formula, ['1', 'b3', 'b5', 'bb7']);
	assert.equal(degree('5A'), '#5');
	assert.equal(pretty('Bbm7b5'), 'B♭m7♭5');
});

void test('key info pairs the major and minor keys of a root', () => {
	assert.deepEqual(keyInfo(1), [
		{ dominant: 'Ab', keySignature: 'bbbbb', name: 'Db', parallel: 'Dbm', relative: 'Bbm', subdominant: 'Gb' },
		{ dominant: 'G#m', keySignature: '####', name: 'C#m', parallel: 'C#', relative: 'E', subdominant: 'F#m' }
	]);
	assert.equal(signature('bbbbb'), '5♭');
	assert.equal(signature(''), '0');
});

void test('diatonic chords carry roman numerals', () => {
	const major = availableRows('C', 'major');
	assert.deepEqual(
		major.map(({ numeral }) => numeral),
		['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
	);
	assert.deepEqual(
		major.map(({ seventh }) => seventh),
		['CMaj7', 'Dm7', 'Em7', 'FMaj7', 'G7', 'Am7', 'Bm7b5']
	);
	assert.deepEqual(
		availableRows('A', 'harmonic minor').map(({ numeral }) => numeral),
		['i', 'ii°', 'bIII+', 'iv', 'V', 'bVI', 'vii°']
	);
	assert.deepEqual(diatonic('C', 'major pentatonic'), { tag: 'not-applicable' });
	assert.deepEqual(diatonic('C', 'minor blues'), { tag: 'not-applicable' });
});

void test('every diatonic chord of every root and heptatonic scale has a chord type', () => {
	for (const chroma of CHROMAS) {
		for (const scale of HEPTATONIC) {
			const tonic = spell(chroma, scale);
			const rows = availableRows(tonic, scale);
			assert.equal(rows.length, 7, `${tonic} ${scale}`);
			for (const { seventh, triad } of rows) {
				assert.ok(chordType(triad), `${tonic} ${scale}: ${triad}`);
				assert.ok(chordType(seventh), `${tonic} ${scale}: ${seventh}`);
			}
		}
	}
});

void test('progressions resolve in the key', () => {
	assert.deepEqual(progression('C', ['I', 'V', 'vi', 'IV']), ['C', 'G', 'Am', 'F']);
	assert.deepEqual(progression('C', ['ii7', 'V7', 'Imaj7']), ['Dm7', 'G7', 'Cmaj7']);
	assert.deepEqual(progression('A', ['i', 'bVII', 'bVI', 'V']), ['Am', 'G', 'F', 'E']);
	assert.deepEqual(progression('A', ['iiø7', 'V7', 'i7']), ['Bm7b5', 'E7', 'Am7']);
	for (const chroma of CHROMAS) {
		for (const { numerals, tonality } of PROGRESSIONS) {
			const tonic = spell(chroma, tonality);
			const chords = progression(tonic, numerals);
			assert.equal(chords.length, numerals.length);
			for (const chord of chords) assert.ok(chordType(chord), `${tonic} ${tonality}: ${chord}`);
		}
	}
});

void test('fretboard marks label chromas', () => {
	for (const root of CHROMAS) {
		const marks = intervalMarks(root);
		assert.equal(marks.size, CHROMAS.length);
		assert.deepEqual(
			[...marks.keys()].sort((a, b) => a - b),
			[...CHROMAS]
		);
	}
	assert.equal(intervalMarks(9).get(9), '1');
	assert.equal(intervalMarks(0).get(6), '♭5');
	assert.deepEqual(
		[...noteMarks(['C', 'Eb'])],
		[
			[0, 'C'],
			[3, 'E♭']
		]
	);
	assert.equal(SCALES.length, 7);
});

void test('closed mode and spelling domains agree with Tonal', () => {
	assert.deepEqual(MODES, Mode.names());
	for (const chroma of CHROMAS) {
		for (const scale of [...SCALES, ...MODES]) {
			assert.equal(Note.chroma(spell(chroma, scale)), chroma, `${String(chroma)} ${scale}`);
		}
	}
});
