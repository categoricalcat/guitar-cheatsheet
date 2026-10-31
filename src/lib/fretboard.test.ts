import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FRETS, neck } from './fretboard.ts';
import { intervalMarks, noteMarks } from './theory.ts';
import { TUNING } from './voicings.ts';

test('a single note is found on every string, open strings as open markers', () => {
	assert.deepEqual(neck(noteMarks(['E']), 4).fingers, [
		[6, 0],
		[6, 12, { text: 'E', className: 'root' }],
		[5, 7, { text: 'E', className: 'root' }],
		[4, 2, { text: 'E', className: 'root' }],
		[3, 9, { text: 'E', className: 'root' }],
		[2, 5, { text: 'E', className: 'root' }],
		[1, 0],
		[1, 12, { text: 'E', className: 'root' }]
	]);
});

test('the interval map marks every fret and only the root as root', () => {
	const { fingers } = neck(intervalMarks(0), 0);
	assert.equal(fingers.length, TUNING.length * (FRETS + 1));
	const roots = fingers.filter(([, , options]) => typeof options === 'object' && options.className === 'root');
	assert.deepEqual(
		roots.map(([string, fret]) => [string, fret]),
		[
			[6, 8],
			[5, 3],
			[4, 10],
			[3, 5],
			[2, 1],
			[1, 8]
		]
	);
});
