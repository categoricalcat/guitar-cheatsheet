import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FRETS, neck } from './fretboard.ts';
import { intervalMarks, noteMarks } from './theory.ts';
import { TUNING } from './voicings.ts';

void test('a single note is found on every string, open strings as open markers', () => {
	assert.deepEqual(neck(noteMarks(['E']), 4).fingers, [
		[6, 0, { strokeColor: 'var(--accent)', text: 'E', textColor: 'var(--accent)' }],
		[6, 12, { className: 'root', text: 'E' }],
		[5, 7, { className: 'root', text: 'E' }],
		[4, 2, { className: 'root', text: 'E' }],
		[3, 9, { className: 'root', text: 'E' }],
		[2, 5, { className: 'root', text: 'E' }],
		[1, 0, { strokeColor: 'var(--accent)', text: 'E', textColor: 'var(--accent)' }],
		[1, 12, { className: 'root', text: 'E' }]
	]);
});

void test('the interval map marks every fret and only the root as root', () => {
	const { fingers } = neck(intervalMarks(0), 0);
	assert.equal(fingers.length, TUNING.length * (FRETS + 1));
	assert.deepEqual(fingers[0], [6, 0, { strokeColor: 'currentColor', text: '3', textColor: 'currentColor' }]);
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
