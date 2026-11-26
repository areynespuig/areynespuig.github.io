import { browser } from '$app/env';
import fallback from '#lib/content/site.json';
import { loadPublishedContent } from '#lib/content/remote.ts';
import type { SiteContent } from '#lib/content/types.ts';
import type { LayoutLoad } from './$types';

/**
 * Contenido de la web. Al generarla (prerender) se lee de Supabase y queda escrito en el HTML;
 * en el navegador, la misma petición se reutiliza al abrir la página. Si se llega a una página
 * que aún no se ha generado (por ejemplo, la de un proyecto recién publicado), se lee de Supabase
 * en ese momento.
 */
export const load: LayoutLoad = async ({ fetch }) => {
	try {
		return { content: (await loadPublishedContent(fetch)) ?? (fallback as SiteContent) };
	} catch (err) {
		// Al generar la web, un fallo de Supabase para el despliegue; en el navegador, se usa lo incluido.
		if (!browser) throw err;
		return { content: fallback as SiteContent };
	}
};
