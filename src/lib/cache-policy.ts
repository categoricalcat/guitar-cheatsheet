export function isPrecachedPath(path: string, paths: ReadonlySet<string>): boolean {
	return paths.has(path);
}

export function shouldHandleFetch(method: string, requestOrigin: string, appOrigin: string): boolean {
	return method === 'GET' && requestOrigin === appOrigin;
}

export function staleCacheKeys(keys: readonly string[], prefix: string, current: string): readonly string[] {
	return keys.filter((key) => key.startsWith(prefix) && key !== current);
}
