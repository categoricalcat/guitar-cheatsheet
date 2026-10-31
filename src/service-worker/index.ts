import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

import { isPrecachedPath, shouldHandleFetch, staleCacheKeys } from '#lib/cache-policy.ts';

const CACHE_PREFIX = 'guitar-cheatsheet-';
const CACHE = `${CACHE_PREFIX}${version}`;

const PRECACHE = new Set(
	[...immutable, ...prerendered, ...assets].map(({ path }) => new URL(path, self.registration.scope).pathname)
);

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(staleCacheKeys(keys, CACHE_PREFIX, CACHE).map((key) => caches.delete(key))))
	);
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (!shouldHandleFetch(event.request.method, url.origin, self.location.origin)) return;
	event.respondWith(respond(event.request, url));
});

async function respond(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);

	if (isPrecachedPath(url.pathname, PRECACHE)) {
		const cached = await cache.match(url.pathname);
		if (cached) return cached;
	}

	try {
		const response = await fetch(request);
		if (response.ok) void cache.put(request, response.clone());
		return response;
	} catch (error) {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw error;
	}
}
