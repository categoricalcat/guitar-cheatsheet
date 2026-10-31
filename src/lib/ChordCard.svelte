<script lang="ts">
	import { BOX, chart } from './chart.ts';
	import { chordInfo, pretty } from './theory.ts';
	import { chordPositions, voicing } from './voicings.ts';

	let { symbol, label = '', more = false }: { symbol: string; label?: string; more?: boolean } = $props();

	const [first, ...rest] = $derived(chordPositions(symbol));
	const { formula } = $derived(chordInfo(symbol));
	let open = $state(false);
</script>

<figure>
	<figcaption>
		{#if label}<span class="label">{pretty(label)}</span>{/if}
		<strong>{pretty(symbol)}</strong>
		<span class="formula">{formula.map(pretty).join(' ')}</span>
	</figcaption>
	{#if first}
		<div class="chart" role="img" aria-label="{symbol} chord diagram" {@attach chart(voicing(first), BOX)}></div>
	{/if}
	{#if more && rest.length > 0}
		<details bind:open>
			<summary>{rest.length} more</summary>
			{#if open}
				{#each rest as position (position)}
					<div class="chart" role="img" aria-label="{symbol} chord diagram" {@attach chart(voicing(position), BOX)}></div>
				{/each}
			{/if}
		</details>
	{/if}
</figure>

<style>
	figure {
		margin: 0;
		display: grid;
		gap: 0.25rem;
		align-content: start;
	}

	figcaption {
		display: grid;
		text-align: center;
	}

	.label,
	.formula,
	summary {
		color: var(--muted);
		font-size: 0.85rem;
	}

	summary {
		cursor: pointer;
		text-align: center;
	}
</style>
