import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { InputDevice, TunerModel, TunerResult } from './model.ts';

import { createTunerController, type OpenInput, type TunerHandle, type TunerPort } from './controller.ts';

type Deferred<T> = {
	readonly promise: Promise<T>;
	readonly resolve: (result: T) => void;
};

function deferred<T>(): Deferred<T> {
	let resolvePromise: ((result: T) => void) | undefined;
	const promise = new Promise<T>((resolve) => {
		resolvePromise = resolve;
	});
	return {
		promise,
		resolve: (result) => {
			if (resolvePromise === undefined) throw new Error('Deferred result was not initialized');
			resolvePromise(result);
		}
	};
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function createFakePort(open: Deferred<TunerResult<TunerHandle>>): {
	readonly getInput: () => OpenInput | undefined;
	readonly port: TunerPort;
	readonly watchStopped: () => boolean;
} {
	let input: OpenInput | undefined;
	let stopped = false;
	const devices: readonly InputDevice[] = [{ id: 'mic', label: 'Microphone' }];
	return {
		getInput: () => input,
		port: {
			enumerateInputs: () => Promise.resolve({ tag: 'ok', value: devices }),
			openInput: (next) => {
				input = next;
				return open.promise;
			},
			watchInputs: () => () => {
				stopped = true;
			}
		},
		watchStopped: () => stopped
	};
}

void test('controller closes a late successful open after stop', async () => {
	const open = deferred<TunerResult<TunerHandle>>();
	const fake = createFakePort(open);
	let model: TunerModel | undefined;
	let closes = 0;
	const controller = createTunerController(fake.port, (next) => {
		model = next;
	});
	controller.mount();
	await settle();
	controller.dispatch({ type: 'start-requested' });
	assert.equal(model?.tag, 'starting');
	controller.dispatch({ type: 'stop-requested' });
	assert.equal(fake.getInput()?.signal.aborted, true);

	open.resolve({ tag: 'ok', value: { close: () => (closes += 1) } });
	await settle();
	assert.equal(closes, 1);
	assert.equal(controller.getModel().tag, 'idle');
	controller.destroy();
});

void test('controller ignores readings after disposal and owns cleanup once', async () => {
	const open = deferred<TunerResult<TunerHandle>>();
	const fake = createFakePort(open);
	const models: TunerModel[] = [];
	let closes = 0;
	const controller = createTunerController(fake.port, (model) => models.push(model));
	controller.mount();
	controller.dispatch({ type: 'start-requested' });
	open.resolve({ tag: 'ok', value: { close: () => (closes += 1) } });
	await settle();
	assert.equal(controller.getModel().tag, 'listening');

	const input = fake.getInput();
	assert.ok(input);
	controller.destroy();
	controller.destroy();
	const modelCount = models.length;
	input.onReading({ cents: 0, hz: 440, note: 'A4' });
	assert.equal(models.length, modelCount);
	assert.equal(closes, 1);
	assert.equal(fake.watchStopped(), true);
});

void test('controller turns port failures into tagged model failures', async () => {
	const open = deferred<TunerResult<TunerHandle>>();
	const fake = createFakePort(open);
	const controller = createTunerController(fake.port, () => undefined);
	controller.mount();
	controller.dispatch({ type: 'start-requested' });
	open.resolve({ failure: { tag: 'permission-denied' }, tag: 'error' });
	await settle();
	const model = controller.getModel();
	assert.equal(model.tag, 'failed');
	assert.equal(model.failure.tag, 'permission-denied');
	controller.destroy();
});

void test('controller turns enumeration failures into tagged model failures', async () => {
	const port: TunerPort = {
		enumerateInputs: () => Promise.resolve({ failure: { tag: 'unsupported' }, tag: 'error' }),
		openInput: () => Promise.resolve({ failure: { tag: 'unsupported' }, tag: 'error' }),
		watchInputs: () => () => undefined
	};
	const controller = createTunerController(port, () => undefined);
	controller.mount();
	await settle();
	const model = controller.getModel();
	assert.equal(model.tag, 'failed');
	assert.equal(model.failure.tag, 'unsupported');
	controller.destroy();
});

void test('controller ignores superseded device enumeration results', async () => {
	const first = deferred<TunerResult<readonly InputDevice[]>>();
	const second = deferred<TunerResult<readonly InputDevice[]>>();
	let calls = 0;
	const port: TunerPort = {
		enumerateInputs: () => {
			calls += 1;
			return calls === 1 ? first.promise : second.promise;
		},
		openInput: () => Promise.resolve({ failure: { tag: 'unsupported' }, tag: 'error' }),
		watchInputs: () => () => undefined
	};
	const controller = createTunerController(port, () => undefined);
	controller.mount();
	controller.dispatch({ type: 'devices-changed' });

	second.resolve({ tag: 'ok', value: [{ id: 'new', label: 'New input' }] });
	await settle();
	first.resolve({ tag: 'ok', value: [{ id: 'old', label: 'Old input' }] });
	await settle();

	assert.deepEqual(controller.getModel().devices, [{ id: 'new', label: 'New input' }]);
	controller.destroy();
});
