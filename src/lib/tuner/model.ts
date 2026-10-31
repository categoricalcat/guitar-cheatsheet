import type { Reading } from './detector.ts';

export type InputDevice = {
	readonly id: string;
	readonly label: string;
};

export type Transition = readonly [model: TunerModel, commands: readonly TunerCommand[]];

export type TunerCommand =
	| { readonly deviceId: string; readonly generation: number; readonly type: 'open-input' }
	| { readonly generation: number; readonly type: 'close-input' }
	| { readonly type: 'enumerate-devices' };

export type TunerEvent =
	| { readonly deviceId: string; readonly type: 'device-selected' }
	| { readonly devices: readonly InputDevice[]; readonly type: 'devices-received' }
	| { readonly failure: TunerFailure; readonly generation: number; readonly type: 'start-failed' }
	| { readonly failure: TunerFailure; readonly type: 'devices-failed' }
	| { readonly generation: number; readonly reading: Reading | undefined; readonly type: 'reading-received' }
	| { readonly generation: number; readonly type: 'start-succeeded' }
	| { readonly type: 'devices-changed' }
	| { readonly type: 'mounted' }
	| { readonly type: 'start-requested' }
	| { readonly type: 'stop-requested' }
	| { readonly type: 'unmounted' };

export type TunerFailure =
	| { readonly message: string; readonly tag: 'unknown' }
	| { readonly tag: 'device-unavailable' }
	| { readonly tag: 'permission-denied' }
	| { readonly tag: 'unsupported' };

export type TunerModel =
	| (ModelBase & { readonly failure: TunerFailure; readonly tag: 'failed' })
	| (ModelBase & { readonly reading: Reading | undefined; readonly tag: 'listening' })
	| (ModelBase & { readonly tag: 'idle' })
	| (ModelBase & { readonly tag: 'starting' });

export type TunerResult<T> =
	{ readonly failure: TunerFailure; readonly tag: 'error' } | { readonly tag: 'ok'; readonly value: T };

type ModelBase = {
	readonly devices: readonly InputDevice[];
	readonly generation: number;
	readonly selectedDeviceId: string;
};

export function failureMessage(failure: TunerFailure): string {
	switch (failure.tag) {
		case 'device-unavailable':
			return 'The selected audio input is unavailable';
		case 'permission-denied':
			return 'Microphone permission was denied';
		case 'unknown':
			return failure.message;
		case 'unsupported':
			return 'Audio input is not supported by this browser';
	}
}

export function initialTunerModel(): TunerModel {
	return { devices: [], generation: 0, selectedDeviceId: '', tag: 'idle' };
}

export function transition(model: TunerModel, event: TunerEvent): Transition {
	switch (event.type) {
		case 'device-selected':
			if (model.tag === 'starting' || model.tag === 'listening') return [model, []];
			return [
				{
					...model,
					selectedDeviceId:
						event.deviceId === '' || model.devices.some(({ id }) => id === event.deviceId) ? event.deviceId : ''
				},
				[]
			];
		case 'devices-changed':
		case 'mounted':
			return [model, [{ type: 'enumerate-devices' }]];
		case 'devices-failed':
			return model.tag === 'starting' || model.tag === 'listening'
				? [model, []]
				: [
						{
							devices: model.devices,
							failure: event.failure,
							generation: model.generation,
							selectedDeviceId: model.selectedDeviceId,
							tag: 'failed'
						},
						[]
					];
		case 'devices-received':
			return [withDevices(model, event.devices), []];
		case 'reading-received':
			return model.tag === 'listening' && event.generation === model.generation
				? [{ ...model, reading: event.reading }, []]
				: [model, []];
		case 'start-failed':
			return model.tag === 'starting' && event.generation === model.generation
				? [
						{
							devices: model.devices,
							failure: event.failure,
							generation: model.generation,
							selectedDeviceId: model.selectedDeviceId,
							tag: 'failed'
						},
						[]
					]
				: [model, []];
		case 'start-requested': {
			if (model.tag === 'starting' || model.tag === 'listening') return [model, []];
			const generation = model.generation + 1;
			return [
				{
					devices: model.devices,
					generation,
					selectedDeviceId: model.selectedDeviceId,
					tag: 'starting'
				},
				[{ deviceId: model.selectedDeviceId, generation, type: 'open-input' }]
			];
		}
		case 'start-succeeded':
			return model.tag === 'starting' && event.generation === model.generation
				? [
						{
							devices: model.devices,
							generation: model.generation,
							reading: undefined,
							selectedDeviceId: model.selectedDeviceId,
							tag: 'listening'
						},
						[{ type: 'enumerate-devices' }]
					]
				: [model, [{ generation: event.generation, type: 'close-input' }]];
		case 'stop-requested':
		case 'unmounted': {
			const active = model.tag === 'starting' || model.tag === 'listening';
			const generation = model.generation + 1;
			return [idle(model, generation), active ? [{ generation: model.generation, type: 'close-input' }] : []];
		}
	}
}

function idle(model: TunerModel, generation: number): TunerModel {
	return {
		devices: model.devices,
		generation,
		selectedDeviceId: model.selectedDeviceId,
		tag: 'idle'
	};
}

function withDevices(model: TunerModel, devices: readonly InputDevice[]): TunerModel {
	const selectedDeviceId =
		model.selectedDeviceId !== '' && devices.some(({ id }) => id === model.selectedDeviceId)
			? model.selectedDeviceId
			: '';
	return { ...model, devices, selectedDeviceId };
}
