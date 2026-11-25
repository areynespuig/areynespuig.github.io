import { SUPABASE, supabaseConfigured } from '../config';
import type { SiteContent } from './types';

function contentUrl(): string {
	return `${SUPABASE.url}/rest/v1/site_content?id=eq.main&select=content`;
}

/**
 * Lee el contenido publicado desde Supabase al generar la web.
 * Devuelve null si Supabase no está configurado. Si está configurado y falla, lanza un error
 * para que el despliegue se pare y la web publicada se quede como estaba.
 */
export async function loadPublishedContent(fetcher: typeof fetch): Promise<SiteContent | null> {
	if (!supabaseConfigured) return null;
	const res = await fetcher(contentUrl(), {
		headers: { apikey: SUPABASE.publishableKey, Accept: 'application/json' }
	});
	if (!res.ok) throw new Error(`Supabase ha respondido ${res.status} al leer el contenido.`);
	const rows = (await res.json()) as { content: SiteContent }[];
	if (!rows.length) throw new Error('No hay contenido en la tabla site_content. Ejecuta supabase/seed.sql.');
	return rows[0].content;
}

let latest: Promise<SiteContent | null> | null = null;

/**
 * Lee la última versión publicada desde el navegador, para que lo que se publica en el editor
 * se vea al momento sin esperar a que GitHub vuelva a generar la web.
 * Se pide una sola vez por visita; si falla, la página se queda con el contenido generado.
 */
export function fetchLatestContent(): Promise<SiteContent | null> {
	if (!supabaseConfigured) return Promise.resolve(null);
	latest ??= fetch(contentUrl(), {
		cache: 'no-store',
		headers: { apikey: SUPABASE.publishableKey, Accept: 'application/json' }
	})
		.then(async (res) => {
			if (!res.ok) return null;
			const rows = (await res.json()) as { content: SiteContent }[];
			return rows[0]?.content ?? null;
		})
		.catch(() => null);
	return latest;
}
