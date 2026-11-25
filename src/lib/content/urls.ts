import { SITE } from '../config';

const ALLOWED = new Set(['http:', 'https:', 'mailto:']);

/** Devuelve el enlace solo si es http(s) o mailto; cualquier otro esquema (javascript:, data:…) se descarta. */
export function safeHref(url: string): string | undefined {
	if (!url?.trim()) return undefined;
	try {
		return ALLOWED.has(new URL(url, SITE.url).protocol) ? url : undefined;
	} catch {
		return undefined;
	}
}

/** Convierte una ruta de la web (/foto.jpg) en URL completa; las URL completas se dejan igual. */
export function absoluteUrl(path: string): string {
	return /^https?:\/\//i.test(path) ? path : SITE.url + path;
}
