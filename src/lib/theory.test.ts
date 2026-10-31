import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChordType } from 'tonal';
import {
	CHORD_TYPES,
	CHROMAS,
	MODES,
	PROGRESSIONS,
	SCALES,
	chordInfo,
	chordType,
	degree,
	diatonic,
	intervalMarks,
	keyInfo,
	noteMarks,
	pretty,
	progression,
	rootLabel,
	scaleInfo,
	signature,
	spell
} from './theory.ts';

const HEPTATONIC = ['major', 'minor', 'harmonic minor', 'melodic minor', ...MODES];

test('chord types are known to Tonal and distinct', () => {
	const setNums = CHORD_TYPES.map(({ symbol }) => {
		const type = ChordType.get(symbol);
		assert.equal(type.empty, false, symbol);
		return type.setNum;
	});
	assert.equal(new Set(setNums).size, CHORD_TYPES.length);
});

test('roots are spelled with the fewest accidentals for the scale', () => {
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

test('formulas use scale-degree labels', () => {
	assert.deepEqual(scaleInfo('C', 'minor blues'), {
		notes: ['C', 'Eb', 'F', 'Gb', 'G', 'Bb'],
		formula: ['1', 'b3', '4', 'b5', '5', 'b7']
	});
	assert.deepEqual(chordInfo('Cdim7').formula, ['1', 'b3', 'b5', 'bb7']);
	assert.equal(degree('5A'), '#5');
	assert.equal(pretty('Bbm7b5'), 'B♭m7♭5');
});

test('key info pairs the major and minor keys of a root', () => {
	assert.deepEqual(keyInfo(1), [
		{ keySignature: 'bbbbb', relative: 'Bbm', name: 'Db', subdominant: 'Gb', dominant: 'Ab' },
		{ keySignature: '####', relative: 'E', name: 'C#m', subdominant: 'F#m', dominant: 'G#m' }
	]);
	assert.equal(signature('bbbbb'), '5♭');
	assert.equal(signature(''), '0');
});

test('diatonic chords carry roman numerals', () => {
	const major = diatonic('C', 'major');
	assert.deepEqual(
		major.map(({ numeral }) => numeral),
		['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
	);
	assert.deepEqual(
		major.map(({ seventh }) => seventh),
		['CMaj7', 'Dm7', 'Em7', 'FMaj7', 'G7', 'Am7', 'Bm7b5']
	);
	assert.deepEqual(
		diatonic('A', 'harmonic minor').map(({ numeral }) => numeral),
		['i', 'ii°', 'bIII+', 'iv', 'V', 'bVI', 'vii°']
	);
	assert.deepEqual(diatonic('C', 'major pentatonic'), []);
	assert.deepEqual(diatonic('C', 'minor blues'), []);
});

test('every diatonic chord of every root and heptatonic scale has a chord type', () => {
	for (const chroma of CHROMAS) {
		for (const scale of HEPTATONIC) {
			const tonic = spell(chroma, scale);
			const rows = diatonic(tonic, scale);
			assert.equal(rows.length, 7, `${tonic} ${scale}`);
			for (const { triad, seventh } of rows) {
				assert.ok(chordType(triad), `${tonic} ${scale}: ${triad}`);
				assert.ok(chordType(seventh), `${tonic} ${scale}: ${seventh}`);
			}
		}
	}
});

test('progressions resolve in the key', () => {
	assert.deepEqual(progression('C', ['I', 'V', 'vi', 'IV']), ['C', 'G', 'Am', 'F']);
	assert.deepEqual(progression('C', ['ii7', 'V7', 'Imaj7']), ['Dm7', 'G7', 'Cmaj7']);
	assert.deepEqual(progression('A', ['i', 'bVII', 'bVI', 'V']), ['Am', 'G', 'F', 'E']);
	assert.deepEqual(progression('A', ['iiø7', 'V7', 'i7']), ['Bm7b5', 'E7', 'Am7']);
	for (const chroma of CHROMAS) {
		for (const { tonality, numerals } of PROGRESSIONS) {
			const tonic = spell(chroma, tonality);
			const chords = progression(tonic, numerals);
			assert.equal(chords.length, numerals.length);
			for (const chord of chords) assert.ok(chordType(chord), `${tonic} ${tonality}: ${chord}`);
		}
	}
});

test('fretboard marks label chromas', () => {
	assert.equal(intervalMarks(9).size, 12);
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
