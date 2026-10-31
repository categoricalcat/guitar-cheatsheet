<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { pretty } from '#lib/theory.ts';
	import { inputs, listen, type Reading } from '#lib/tuner.ts';

	const IN_TUNE = 5;

	let devices = $state<MediaDeviceInfo[]>([]);
	let deviceId = $state('');
	let reading = $state<Reading>();
	let stop = $state<() => void>();
	let error = $state('');

	onMount(async () => {
		devices = await inputs();
	});

	onDestroy(() => stop?.());

	async function toggle() {
		if (stop) {
			stop();
			stop = undefined;
			return;
		}
		error = '';
		try {
			stop = await listen(deviceId, (next) => (reading = next));
			devices = await inputs();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : String(cause);
		}
	}
</script>

<svelte:head>
	<title>Tuner · Guitar Cheatsheet</title>
</svelte:head>

<div class="controls">
	<select bind:value={deviceId} disabled={stop !== undefined} aria-label="Audio input">
		<option value="">Default input</option>
		{#each devices as device (device.deviceId)}
			<option value={device.deviceId}>{device.label || device.deviceId}</option>
		{/each}
	</select>
	<button onclick={toggle}>{stop ? 'Stop' : 'Start'}</button>
</div>

{#if error}
	<p class="error">{error}</p>
{/if}

<output class:in-tune={reading !== undefined && Math.abs(reading.cents) <= IN_TUNE}>
	<span class="note">{reading ? pretty(reading.note) : '–'}</span>
	<span class="cents">{reading ? `${reading.cents > 0 ? '+' : ''}${reading.cents} ¢` : ' '}</span>
	<span class="meter"><span class="needle" style:left="{50 + (reading?.cents ?? 0)}%"></span></span>
	<span class="hz">{reading ? `${reading.hz.toFixed(1)} Hz` : ' '}</span>
</output>

<style>
	.controls {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	select,
	button {
		font: inherit;
	}

	select {
		flex: 1;
		min-width: 0;
	}

	.error {
		color: var(--accent);
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
		background: linear-gradient(var(--fg), var(--fg)) center / 2px 100% no-repeat, var(--line);
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
