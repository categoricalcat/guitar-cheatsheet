<script lang="ts">
	import { BOX, chart } from './chart.ts';
	import { chordInfo, pretty } from './theory.ts';
	import { chordPositions, voicing } from './voicings.ts';

	let { label = '', more = false, symbol }: { label?: string; more?: boolean; symbol: string } = $props();

	const [first, ...rest] = $derived(chordPositions(symbol));
	const { formula } = $derived(chordInfo(symbol));
	const diagramLabel = $derived(`${label.length > 0 ? `${pretty(label)} ` : ''}${pretty(symbol)} chord diagram`);
	let open = $state(false);
</script>

<figure>
	<figcaption>
		{#if label.length > 0}<span class="label">{pretty(label)}</span>{/if}
		<strong>{pretty(symbol)}</strong>
		<span class="formula">{formula.map(pretty).join(' ')}</span>
	</figcaption>
	{#if first}
		<div data-chart role="img" aria-label="{diagramLabel}, voicing 1" {@attach chart(voicing(first), BOX)}></div>
	{/if}
	{#if more && rest.length > 0}
		<details bind:open>
			<summary>{rest.length} more</summary>
			{#if open}
				{#each rest as position, index (position)}
					<div
						data-chart
						role="img"
						aria-label="{diagramLabel}, voicing {index + 2}"
						{@attach chart(voicing(position), BOX)}
					></div>
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
