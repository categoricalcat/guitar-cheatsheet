import assert from 'node:assert/strict';
import { test } from 'node:test';

import { detector, FFT_SIZE, isGuitarPitch, MAX_HZ, MIN_HZ, reading } from './tuner/detector.ts';

const SAMPLE_RATE = 48_000;
const detect = detector(FFT_SIZE);

const wave = (hz: number, shape: (phase: number) => number): Float32Array =>
	Float32Array.from({ length: FFT_SIZE }, (_, i) => shape(((i * hz) / SAMPLE_RATE) % 1));

const SHAPES = {
	sawtooth: (phase: number) => 2 * phase - 1,
	sine: (phase: number) => Math.sin(2 * Math.PI * phase)
};

const detune = (hz: number, cents: number) => hz * 2 ** (cents / 1200);

void test('frequencies map to the nearest note and cents', () => {
	assert.deepEqual(reading(440), { cents: 0, hz: 440, note: 'A4' });
	assert.deepEqual(reading(82.41), { cents: 0, hz: 82.41, note: 'E2' });
	assert.equal(reading(detune(440, 20)).cents, 20);
	assert.equal(reading(detune(440, -45)).note, 'A4');
	assert.equal(reading(466.16).note, 'A#4');
});

void test('synthetic notes are detected within 2 cents', () => {
	const cases = [
		{ cents: 0, hz: 82.41, note: 'E2' },
		{ cents: 0, hz: 110, note: 'A2' },
		{ cents: 0, hz: 440, note: 'A4' },
		{ cents: 20, hz: detune(440, 20), note: 'A4' },
		{ cents: -20, hz: detune(440, -20), note: 'A4' },
		{ cents: -20, hz: detune(82.41, -20), note: 'E2' }
	];
	for (const [name, shape] of Object.entries(SHAPES)) {
		for (const { cents, hz, note } of cases) {
			const result = detect(wave(hz, shape), SAMPLE_RATE);
			const label = `${name} ${String(hz)}`;
			assert.ok(result, label);
			assert.equal(result.note, note, label);
			assert.ok(Math.abs(result.cents - cents) <= 2, `${label}: ${String(result.cents)} vs ${String(cents)}`);
		}
	}
});

void test('silence and noise give no reading', () => {
	let seed = 1;
	const noise = Float32Array.from({ length: FFT_SIZE }, () => {
		seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
		return seed / 2 ** 30 - 1;
	});
	assert.equal(detect(new Float32Array(FFT_SIZE), SAMPLE_RATE), undefined);
	assert.equal(detect(noise, SAMPLE_RATE), undefined);
});

void test('pitches outside the guitar range give no reading', () => {
	assert.equal(detect(wave(55, SHAPES.sine), SAMPLE_RATE), undefined);
	assert.equal(detect(wave(1500, SHAPES.sine), SAMPLE_RATE), undefined);
});

void test('guitar range boundaries are inclusive', () => {
	assert.equal(isGuitarPitch(MIN_HZ), true);
	assert.equal(isGuitarPitch(MAX_HZ), true);
	assert.equal(isGuitarPitch(MIN_HZ - 1), false);
	assert.equal(isGuitarPitch(MAX_HZ + 1), false);
});
