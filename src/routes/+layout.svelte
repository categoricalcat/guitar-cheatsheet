<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ id: '/', label: 'Cheatsheet' },
		{ id: '/tuner', label: 'Tuner' }
	] as const;
</script>

<nav>
	{#each links as link (link.id)}
		<a href={resolve(link.id)} aria-current={page.route.id === link.id ? 'page' : undefined}>
			{link.label}
		</a>
	{/each}
</nav>

<main>
	{@render children()}
</main>

<style>
	:global(:root) {
		color-scheme: light dark;
		--fg: light-dark(#1b1b1f, #e8e8ea);
		--bg: light-dark(#fafafa, #121214);
		--muted: light-dark(#6b6b76, #9a9aa5);
		--line: light-dark(#d9d9de, #2c2c31);
		--accent: light-dark(#c2410c, #fb923c);
		font-family: system-ui, sans-serif;
		color: var(--fg);
		background: var(--bg);
	}

	:global(body) {
		margin: 0;
	}

	:global([data-chart] svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	:global([data-chart] .finger-text) {
		fill: var(--bg);
	}

	:global([data-chart] .root:not(.finger-text)) {
		fill: var(--accent);
		stroke: var(--accent);
	}

	:global([data-chart] .fret-marker) {
		fill: var(--line);
	}

	nav {
		display: flex;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--line);
	}

	a {
		color: var(--muted);
		text-decoration: none;
	}

	a[aria-current='page'] {
		color: var(--accent);
	}

	main {
		max-width: 60rem;
		margin: 0 auto;
		padding: 1rem;
	}
</style>
