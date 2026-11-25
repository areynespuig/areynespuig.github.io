import { SUPABASE, supabaseConfigured } from '../config';
import type { SiteContent } from './types';

/**
 * Lee el contenido publicado desde Supabase al generar la web.
 * Devuelve null si Supabase no está configurado. Si está configurado y falla, lanza un error
 * para que el despliegue se pare y la web publicada se quede como estaba.
 */
export async function loadPublishedContent(fetcher: typeof fetch): Promise<SiteContent | null> {
	if (!supabaseConfigured) return null;
	const res = await fetcher(`${SUPABASE.url}/rest/v1/site_content?id=eq.main&select=content`, {
		headers: { apikey: SUPABASE.publishableKey, Accept: 'application/json' }
	});
	if (!res.ok) throw new Error(`Supabase ha respondido ${res.status} al leer el contenido.`);
	const rows = (await res.json()) as { content: SiteContent }[];
	if (!rows.length) throw new Error('No hay contenido en la tabla site_content. Ejecuta supabase/seed.sql.');
	return rows[0].content;
}
