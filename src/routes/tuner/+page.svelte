<script lang="ts">
	import { onMount } from 'svelte';

	import { pretty } from '#lib/theory.ts';
	import { createBrowserTunerPort } from '#lib/tuner/browser.ts';
	import { createTunerController, type TunerController } from '#lib/tuner/controller.ts';
	import { failureMessage, initialTunerModel, type TunerEvent, type TunerModel } from '#lib/tuner/model.ts';

	const IN_TUNE = 5;

	let controller: TunerController | undefined;
	let model = $state<TunerModel>(initialTunerModel());
	const error = $derived(model.tag === 'failed' ? failureMessage(model.failure) : '');
	const reading = $derived(model.tag === 'listening' ? model.reading : undefined);
	const cents = $derived(reading === undefined ? ' ' : `${reading.cents > 0 ? '+' : ''}${String(reading.cents)} ¢`);
	const frequency = $derived(reading === undefined ? ' ' : `${reading.hz.toFixed(1)} Hz`);
	const needle = $derived(`${String(50 + (reading?.cents ?? 0))}%`);
	const note = $derived(reading === undefined ? '–' : pretty(reading.note));
	const announcement = $derived(
		reading === undefined
			? 'No pitch detected'
			: `${pretty(reading.note)}, ${
					Math.abs(reading.cents) <= IN_TUNE ? 'in tune' : reading.cents < 0 ? 'flat' : 'sharp'
				}`
	);

	onMount(() => {
		const active = createTunerController(createBrowserTunerPort(), (next) => (model = next));
		controller = active;
		active.mount();
		return () => {
			active.destroy();
			if (controller === active) controller = undefined;
		};
	});

	function dispatch(event: TunerEvent) {
		controller?.dispatch(event);
	}
</script>

<svelte:head>
	<title>Tuner · Guitar Cheatsheet</title>
</svelte:head>

<h1>Tuner</h1>

<div class="controls">
	<select
		aria-label="Audio input"
		disabled={model.tag === 'listening' || model.tag === 'starting'}
		value={model.selectedDeviceId}
		onchange={(event) => {
			dispatch({ deviceId: event.currentTarget.value, type: 'device-selected' });
		}}
	>
		<option value="">Default input</option>
		{#each model.devices as device (device.id)}
			<option value={device.id}>{device.label}</option>
		{/each}
	</select>
	<button
		type="button"
		disabled={model.tag === 'starting'}
		onclick={() => {
			dispatch({ type: model.tag === 'listening' ? 'stop-requested' : 'start-requested' });
		}}
	>
		{model.tag === 'starting' ? 'Starting…' : model.tag === 'listening' ? 'Stop' : 'Start'}
	</button>
</div>

{#if error}
	<p class="error" role="alert">{error}</p>
{/if}

<span class="sr-only" aria-live="polite">{announcement}</span>
<output aria-label="Tuner reading" class:in-tune={reading !== undefined && Math.abs(reading.cents) <= IN_TUNE}>
	<span class="note">{note}</span>
	<span class="cents">{cents}</span>
	<span aria-hidden="true" class="meter">
		<span class="needle" style:left={needle}></span>
	</span>
	<span class="hz">{frequency}</span>
</output>

<style>
	.controls {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	select {
		flex: 1;
		min-width: 0;
	}

	.error {
		color: var(--accent);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	output {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
		margin-top: 3rem;
	}

	.note {
		font-size: 5rem;
		font-weight: 700;
		line-height: 1;
	}

	.cents,
	.hz {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.meter {
		position: relative;
		width: min(100%, 24rem);
		height: 0.5rem;
		border-radius: 0.25rem;
		background:
			linear-gradient(var(--fg), var(--fg)) center / 2px 100% no-repeat,
			var(--line);
	}

	.needle {
		position: absolute;
		top: -0.5rem;
		width: 4px;
		height: 1.5rem;
		margin-left: -2px;
		border-radius: 2px;
		background: var(--accent);
	}

	.in-tune .note,
	.in-tune .cents {
		color: light-dark(#15803d, #4ade80);
	}

	.in-tune .needle {
		background: light-dark(#15803d, #4ade80);
	}
</style>
