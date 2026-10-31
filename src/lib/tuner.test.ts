import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FFT_SIZE, detector, reading } from './tuner.ts';

const SAMPLE_RATE = 48_000;
const detect = detector(FFT_SIZE);

const wave = (hz: number, shape: (phase: number) => number): Float32Array =>
	Float32Array.from({ length: FFT_SIZE }, (_, i) => shape(((i * hz) / SAMPLE_RATE) % 1));

const SHAPES = {
	sine: (phase: number) => Math.sin(2 * Math.PI * phase),
	sawtooth: (phase: number) => 2 * phase - 1
};

const detune = (hz: number, cents: number) => hz * 2 ** (cents / 1200);

test('frequencies map to the nearest note and cents', () => {
	assert.deepEqual(reading(440), { note: 'A4', cents: 0, hz: 440 });
	assert.deepEqual(reading(82.41), { note: 'E2', cents: 0, hz: 82.41 });
	assert.equal(reading(detune(440, 20)).cents, 20);
	assert.equal(reading(detune(440, -45)).note, 'A4');
	assert.equal(reading(466.16).note, 'A#4');
});

test('synthetic notes are detected within 2 cents', () => {
	const cases = [
		{ hz: 82.41, note: 'E2', cents: 0 },
		{ hz: 110, note: 'A2', cents: 0 },
		{ hz: 440, note: 'A4', cents: 0 },
		{ hz: detune(440, 20), note: 'A4', cents: 20 },
		{ hz: detune(440, -20), note: 'A4', cents: -20 },
		{ hz: detune(82.41, -20), note: 'E2', cents: -20 }
	];
	for (const [name, shape] of Object.entries(SHAPES)) {
		for (const { hz, note, cents } of cases) {
			const result = detect(wave(hz, shape), SAMPLE_RATE);
			assert.ok(result, `${name} ${hz}`);
			assert.equal(result.note, note, `${name} ${hz}`);
			assert.ok(Math.abs(result.cents - cents) <= 2, `${name} ${hz}: ${result.cents} vs ${cents}`);
		}
	}
});

test('silence and noise give no reading', () => {
	let seed = 1;
	const noise = Float32Array.from({ length: FFT_SIZE }, () => {
		seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
		return seed / 2 ** 30 - 1;
	});
	assert.equal(detect(new Float32Array(FFT_SIZE), SAMPLE_RATE), undefined);
	assert.equal(detect(noise, SAMPLE_RATE), undefined);
});
