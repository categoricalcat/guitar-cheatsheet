import type { Reading } from './detector.ts';

import {
	initialTunerModel,
	type InputDevice,
	transition,
	type TunerCommand,
	type TunerEvent,
	type TunerModel,
	type TunerResult
} from './model.ts';

export type OpenInput = {
	readonly deviceId: string;
	readonly onReading: (reading: Reading | undefined) => void;
	readonly signal: AbortSignal;
};

export type TunerController = {
	readonly destroy: () => void;
	readonly dispatch: (event: TunerEvent) => void;
	readonly getModel: () => TunerModel;
	readonly mount: () => void;
};

export type TunerHandle = {
	readonly close: () => void;
};

export type TunerPort = {
	readonly enumerateInputs: () => Promise<TunerResult<readonly InputDevice[]>>;
	readonly openInput: (input: OpenInput) => Promise<TunerResult<TunerHandle>>;
	readonly watchInputs: (onChange: () => void) => () => void;
};

export function createTunerController(port: TunerPort, onModel: (model: TunerModel) => void): TunerController {
	const aborters = new Map<number, AbortController>();
	const handles = new Map<number, TunerHandle>();
	let disposed = false;
	let enumerateSequence = 0;
	let model = initialTunerModel();
	let stopWatching: (() => void) | undefined;

	const close = (generation: number) => {
		aborters.get(generation)?.abort();
		aborters.delete(generation);
		handles.get(generation)?.close();
		handles.delete(generation);
	};

	const dispatch = (event: TunerEvent) => {
		if (disposed) return;
		const [next, commands] = transition(model, event);
		if (next !== model) {
			model = next;
			onModel(model);
		}
		for (const command of commands) execute(command);
	};

	const execute = (command: TunerCommand) => {
		switch (command.type) {
			case 'close-input':
				close(command.generation);
				return;
			case 'enumerate-devices': {
				enumerateSequence += 1;
				const sequence = enumerateSequence;
				void port.enumerateInputs().then((result) => {
					if (disposed || sequence !== enumerateSequence) return;
					if (result.tag === 'ok') {
						dispatch({ devices: result.value, type: 'devices-received' });
					} else {
						dispatch({ failure: result.failure, type: 'devices-failed' });
					}
				});
				return;
			}
			case 'open-input': {
				const aborter = new AbortController();
				aborters.set(command.generation, aborter);
				void port
					.openInput({
						deviceId: command.deviceId,
						onReading: (reading) => {
							dispatch({ generation: command.generation, reading, type: 'reading-received' });
						},
						signal: aborter.signal
					})
					.then((result) => {
						aborters.delete(command.generation);
						if (result.tag === 'error') {
							dispatch({
								failure: result.failure,
								generation: command.generation,
								type: 'start-failed'
							});
							return;
						}
						handles.set(command.generation, result.value);
						if (disposed) {
							close(command.generation);
							return;
						}
						dispatch({ generation: command.generation, type: 'start-succeeded' });
					});
			}
		}
	};

	return {
		destroy: () => {
			if (disposed) return;
			dispatch({ type: 'unmounted' });
			stopWatching?.();
			stopWatching = undefined;
			disposed = true;
			for (const generation of new Set([...aborters.keys(), ...handles.keys()])) close(generation);
		},
		dispatch,
		getModel: () => model,
		mount: () => {
			if (disposed || stopWatching !== undefined) return;
			stopWatching = port.watchInputs(() => {
				dispatch({ type: 'devices-changed' });
			});
			dispatch({ type: 'mounted' });
		}
	};
}
