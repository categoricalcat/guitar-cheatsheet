import assert from 'node:assert/strict';
import { test } from 'node:test';

import { initialTunerModel, type InputDevice, transition, type TunerEvent, type TunerModel } from './model.ts';

const DEVICES: readonly InputDevice[] = [
	{ id: 'default', label: 'Default microphone' },
	{ id: 'line', label: 'Line input' }
];

const next = (model: TunerModel, event: TunerEvent): TunerModel => transition(model, event)[0];

void test('start, reading and stop form an explicit session', () => {
	const idle = next(initialTunerModel(), { devices: DEVICES, type: 'devices-received' });
	const starting = next(idle, { type: 'start-requested' });
	assert.equal(starting.tag, 'starting');

	const [listening, commands] = transition(starting, {
		generation: starting.generation,
		type: 'start-succeeded'
	});
	assert.equal(listening.tag, 'listening');
	assert.deepEqual(commands, [{ type: 'enumerate-devices' }]);

	const reading = { cents: 2, hz: 440, note: 'A4' };
	const heard = next(listening, { generation: listening.generation, reading, type: 'reading-received' });
	assert.equal(heard.tag, 'listening');
	assert.deepEqual(heard.reading, reading);

	const stopped = next(heard, { type: 'stop-requested' });
	assert.equal(stopped.tag, 'idle');
	assert.ok(stopped.generation > heard.generation);
});

void test('stale events are identity transitions or explicit close commands', () => {
	const starting = next(initialTunerModel(), { type: 'start-requested' });
	const stopped = next(starting, { type: 'stop-requested' });
	const [afterReading] = transition(stopped, {
		generation: starting.generation,
		reading: { cents: 0, hz: 440, note: 'A4' },
		type: 'reading-received'
	});
	assert.equal(afterReading, stopped);

	const [afterStart, commands] = transition(stopped, {
		generation: starting.generation,
		type: 'start-succeeded'
	});
	assert.equal(afterStart, stopped);
	assert.deepEqual(commands, [{ generation: starting.generation, type: 'close-input' }]);
});

void test('device refresh and selection preserve a valid selected input', () => {
	const withDevices = next(initialTunerModel(), { devices: DEVICES, type: 'devices-received' });
	const selected = next(withDevices, { deviceId: 'line', type: 'device-selected' });
	assert.equal(selected.selectedDeviceId, 'line');
	assert.equal(next(selected, { devices: DEVICES.slice(0, 1), type: 'devices-received' }).selectedDeviceId, '');
	assert.equal(next(withDevices, { deviceId: 'missing', type: 'device-selected' }).selectedDeviceId, '');
});

void test('bounded event sequences preserve model invariants', () => {
	let frontier: readonly TunerModel[] = [initialTunerModel()];
	for (let depth = 0; depth < 4; depth += 1) {
		const nextModels = new Map<string, TunerModel>();
		for (const model of frontier) {
			const events: readonly TunerEvent[] = [
				{ devices: DEVICES, type: 'devices-received' },
				{ deviceId: 'line', type: 'device-selected' },
				{ failure: { tag: 'device-unavailable' }, type: 'devices-failed' },
				{ generation: model.generation, type: 'start-succeeded' },
				{
					generation: model.generation,
					reading: { cents: 0, hz: 440, note: 'A4' },
					type: 'reading-received'
				},
				{ type: 'devices-changed' },
				{ type: 'mounted' },
				{ type: 'start-requested' },
				{ type: 'stop-requested' },
				{ type: 'unmounted' }
			];
			for (const event of events) {
				const [candidate] = transition(model, event);
				assert.ok(candidate.generation >= model.generation);
				assert.ok(
					candidate.selectedDeviceId === '' || candidate.devices.some(({ id }) => id === candidate.selectedDeviceId)
				);
				nextModels.set(JSON.stringify(candidate), candidate);
			}
		}
		frontier = [...nextModels.values()];
	}
	assert.ok(frontier.length > 0);
});
