import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isPrecachedPath, shouldHandleFetch, staleCacheKeys } from './cache-policy.ts';

void test('stale cache selection is scoped, current-safe and idempotent', () => {
	const keys = ['foreign-cache', 'guitar-cheatsheet-old', 'guitar-cheatsheet-current'];
	const stale = staleCacheKeys(keys, 'guitar-cheatsheet-', 'guitar-cheatsheet-current');
	assert.deepEqual(stale, ['guitar-cheatsheet-old']);
	assert.deepEqual(staleCacheKeys(stale, 'guitar-cheatsheet-', 'guitar-cheatsheet-current'), stale);
});

void test('fetch handling covers method and origin truth table', () => {
	const methods = ['GET', 'POST'] as const;
	const origins = ['https://app.example', 'https://other.example'] as const;
	for (const method of methods) {
		for (const origin of origins) {
			assert.equal(
				shouldHandleFetch(method, origin, 'https://app.example'),
				method === 'GET' && origin === 'https://app.example'
			);
		}
	}
});

void test('precache membership delegates to a readonly set', () => {
	const paths: ReadonlySet<string> = new Set(['/app/', '/app/icon.svg']);
	assert.equal(isPrecachedPath('/app/', paths), true);
	assert.equal(isPrecachedPath('/app/tuner/', paths), false);
});
