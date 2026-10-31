import eslint from '@eslint/js';
import { loadConfig } from '@sveltejs/load-config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const loadedSvelteConfig = await loadConfig('./', { traverse: false });
if (loadedSvelteConfig !== undefined && 'error' in loadedSvelteConfig) {
	throw loadedSvelteConfig.error instanceof Error
		? loadedSvelteConfig.error
		: new Error(String(loadedSvelteConfig.error));
}
const svelteConfig = loadedSvelteConfig?.config ?? {};
const parserOptions = {
	extraFileExtensions: ['.svelte'],
	project: ['./tsconfig.json', './tsconfig.test.json', './src/service-worker/tsconfig.json'],
	tsconfigRootDir: import.meta.dirname
};

export default defineConfig(
	globalIgnores(['.svelte-kit/**', 'build/**', 'node_modules/**', 'package-lock.json', 'static/**']),
	eslint.configs.recommended,
	{
		extends: [ts.configs.strictTypeChecked, ts.configs.stylisticTypeChecked],
		files: ['**/*.{ts,svelte}'],
		languageOptions: { parserOptions },
		rules: {
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'@typescript-eslint/consistent-type-exports': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ fixStyle: 'inline-type-imports', prefer: 'type-imports' }
			],
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/strict-boolean-expressions': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error'
		}
	},
	...svelte.configs.recommended,
	{
		files: ['**/*.svelte'],
		languageOptions: {
			globals: globals.browser,
			parserOptions: { ...parserOptions, parser: ts.parser, svelteConfig }
		},
		rules: {
			'svelte/button-has-type': 'error',
			'svelte/no-target-blank': 'error',
			'svelte/no-unused-class-name': 'error',
			'svelte/prefer-style-directive': 'error',
			'svelte/require-optimized-style-attribute': 'error',
			// The Svelte compiler is the source of template accessibility warnings.
			'svelte/valid-compile': 'error'
		}
	},
	{
		files: ['eslint.config.ts', 'vite.config.ts', '**/*.test.ts'],
		languageOptions: { globals: globals.node }
	},
	{
		files: ['src/lib/chart.ts', 'src/lib/tuner.ts', 'src/lib/tuner/{browser,controller}.ts'],
		languageOptions: { globals: globals.browser }
	},
	{
		files: ['src/service-worker/**/*.ts'],
		languageOptions: { globals: globals.serviceworker }
	},
	{
		files: [
			'src/lib/cache-policy.ts',
			'src/lib/fretboard.ts',
			'src/lib/music-domain.ts',
			'src/lib/theory.ts',
			'src/lib/tuner/detector.ts',
			'src/lib/tuner/model.ts',
			'src/lib/voicings.ts'
		],
		rules: {
			'@typescript-eslint/prefer-readonly-parameter-types': ['error', { treatMethodsAsReadonly: true }]
		}
	},
	perfectionist.configs['recommended-natural'],
	...svelte.configs.prettier,
	eslintConfigPrettier
);
