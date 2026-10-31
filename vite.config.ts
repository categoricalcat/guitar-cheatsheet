import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import process from 'node:process';
import { defineConfig } from 'vite';

const path = process.env['BASE_PATH']?.replace(/^\/+|\/+$/g, '');
const base: '' | `/${string}` = path !== undefined && path.length > 0 ? `/${path}` : '';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({ fallback: '404.html' }),
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			paths: { base }
		})
	]
});
