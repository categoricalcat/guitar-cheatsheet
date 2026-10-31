<script lang="ts">
	import { chart, NECK } from '#lib/chart.ts';
	import ChordCard from '#lib/ChordCard.svelte';
	import { neck } from '#lib/fretboard.ts';
	import {
		type Chroma,
		CHROMAS,
		diatonic,
		intervalMarks,
		keyInfo,
		MODES,
		type MusicScale,
		noteMarks,
		pretty,
		progression,
		PROGRESSIONS,
		ROOT_CHORD_TYPES,
		rootLabel,
		scaleInfo,
		SCALES,
		signature,
		spell
	} from '#lib/theory.ts';

	const TONALITIES = ['major', 'minor'] as const;

	let root = $state<Chroma>(0);
	let scale = $state<MusicScale>('major');
	const open = $state({ chords: false, diatonic: true, intervals: false, key: true, progressions: true, scale: true });

	const tonic = $derived(spell(root, scale));
	const info = $derived(scaleInfo(tonic, scale));
	const harmony = $derived(diatonic(tonic, scale));
	const tonics = $derived({ major: spell(root, 'major'), minor: spell(root, 'minor') });
</script>

<svelte:head>
	<title>{pretty(tonic)} {scale} · Guitar Cheatsheet</title>
</svelte:head>

<fieldset class="roots">
	<legend>Root note</legend>
	{#each CHROMAS as chroma (chroma)}
		<label>
			<input type="radio" name="root" value={chroma} bind:group={root} />
			{rootLabel(chroma)}
		</label>
	{/each}
</fieldset>

<label class="scale-picker">
	<span>Scale / mode</span>
	<span class="select-shell">
		<select bind:value={scale}>
			<optgroup label="Scales">
				{#each SCALES as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</optgroup>
			<optgroup label="Modes">
				{#each MODES as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</optgroup>
		</select>
	</span>
</label>

<h1>{pretty(tonic)} {scale}</h1>

<details bind:open={open.key}>
	<summary>Key</summary>
	<table>
		<thead>
			<tr>
				<th scope="col">Key</th>
				<th scope="col">Signature</th>
				<th scope="col">Relative</th>
				<th scope="col">Parallel</th>
				<th scope="col">Subdominant</th>
				<th scope="col">Dominant</th>
			</tr>
		</thead>
		<tbody>
			{#each keyInfo(root) as key (key.name)}
				<tr>
					<th scope="row">{pretty(key.name)}</th>
					<td>{signature(key.keySignature)}</td>
					<td>{pretty(key.relative)}</td>
					<td>{pretty(key.parallel)}</td>
					<td>{pretty(key.subdominant)}</td>
					<td>{pretty(key.dominant)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</details>

<details bind:open={open.scale}>
	<summary>Scale</summary>
	<table>
		<thead>
			<tr>
				{#each info.formula as step (step)}
					<th scope="col">{pretty(step)}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			<tr>
				{#each info.notes as note (note)}
					<td>{pretty(note)}</td>
				{/each}
			</tr>
		</tbody>
	</table>
	{#if open.scale}
		<div
			data-chart
			class="neck"
			role="img"
			aria-label="{tonic} {scale} on the fretboard"
			{@attach chart(neck(noteMarks(info.notes), root), NECK)}
		></div>
	{/if}
</details>

<details bind:open={open.intervals}>
	<summary>Intervals</summary>
	{#if open.intervals}
		<div
			data-chart
			class="neck"
			role="img"
			aria-label="Intervals from {tonic} on the fretboard"
			{@attach chart(neck(intervalMarks(root), root), NECK)}
		></div>
	{/if}
</details>

{#if harmony.tag === 'available'}
	<details bind:open={open.diatonic}>
		<summary>Diatonic chords</summary>
		{#if open.diatonic}
			<h2>Triads</h2>
			<div class="cards">
				{#each harmony.rows as { numeral, triad } (numeral)}
					<ChordCard symbol={triad} label={numeral} />
				{/each}
			</div>
			<h2>Seventh chords</h2>
			<div class="cards">
				{#each harmony.rows as { numeral, seventh } (numeral)}
					<ChordCard symbol={seventh} label={numeral} />
				{/each}
			</div>
		{/if}
	</details>
{/if}

<details bind:open={open.chords}>
	<summary>Chords on {pretty(tonic)}</summary>
	{#if open.chords}
		<div class="cards">
			{#each ROOT_CHORD_TYPES as type (type.suffix)}
				<ChordCard symbol={tonic + type.symbol} more />
			{/each}
		</div>
	{/if}
</details>

<details bind:open={open.progressions}>
	<summary>Progressions</summary>
	{#each TONALITIES as tonality (tonality)}
		<h2>{pretty(tonics[tonality])} {tonality}</h2>
		<table>
			<thead>
				<tr>
					<th scope="col">Progression</th>
					<th scope="col">Numerals</th>
					<th scope="col">Chords</th>
				</tr>
			</thead>
			<tbody>
				{#each PROGRESSIONS.filter((p) => p.tonality === tonality) as { name, numerals } (name)}
					<tr>
						<th scope="row">{name}</th>
						<td>{numerals.map(pretty).join(' – ')}</td>
						<td>{progression(tonics[tonality], numerals).map(pretty).join(' – ')}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/each}
</details>

<style>
	.roots {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.375rem;
		margin: 0 0 0.875rem;
		padding: 0;
		border: 0;
	}

	.roots legend,
	.scale-picker > span:first-child {
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.roots legend {
		margin-bottom: 0.5rem;
	}

	.roots label {
		position: relative;
		display: grid;
		min-height: 2.75rem;
		padding: 0.35rem 0.25rem;
		place-items: center;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		font-size: 0.75rem;
		text-align: center;
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
		transition:
			border-color 120ms ease,
			background-color 120ms ease,
			color 120ms ease;
	}

	.roots label:hover {
		border-color: var(--muted);
	}

	.roots label:has(:checked) {
		background: light-dark(#fff7ed, #291b15);
		border-color: var(--accent);
		color: var(--accent);
	}

	.roots label:has(:focus-visible) {
		outline: 2px solid var(--accent);
	}

	.roots input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.scale-picker {
		display: grid;
		gap: 0.5rem;
		max-width: 20rem;
		margin-bottom: 1rem;
	}

	.select-shell {
		position: relative;
		display: block;
	}

	.select-shell::after {
		position: absolute;
		top: 50%;
		right: 0.85rem;
		color: var(--muted);
		content: '⌄';
		pointer-events: none;
		transform: translateY(-55%);
	}

	select {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.5rem 2.5rem 0.5rem 0.75rem;
		appearance: none;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 0.5rem;
		color: var(--fg);
		text-transform: capitalize;
		cursor: pointer;
	}

	select:focus-visible {
		border-color: var(--accent);
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}

	h1 {
		font-size: 1.4rem;
	}

	details {
		border-top: 1px solid var(--line);
		padding: 0.5rem 0;
		overflow-x: auto;
	}

	summary {
		font-weight: 600;
		cursor: pointer;
	}

	h2 {
		font-size: 1rem;
		margin: 0.75rem 0 0.25rem;
	}

	table {
		border-collapse: collapse;
		margin: 0.5rem 0;
	}

	th,
	td {
		padding: 0.25rem 0.6rem;
		text-align: left;
	}

	th {
		color: var(--muted);
		font-weight: normal;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
		gap: 0.75rem;
		margin: 0.75rem 0;
	}

	.neck {
		overflow-x: auto;
	}

	.neck :global(svg) {
		min-width: 40rem;
	}

	@media (min-width: 48rem) {
		.roots {
			grid-template-columns: repeat(12, minmax(0, 1fr));
		}
	}

	@media (max-width: 26rem) {
		.roots {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
