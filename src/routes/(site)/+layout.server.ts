import fallback from '#lib/content/site.json';
import { loadPublishedContent } from '#lib/content/remote.ts';
import type { SiteContent } from '#lib/content/types.ts';
import type { LayoutServerLoad } from './$types';

// Se ejecuta al generar la web (prerender): el contenido queda escrito en el HTML estático.
export const load: LayoutServerLoad = async ({ fetch }) => {
	const content = (await loadPublishedContent(fetch)) ?? (fallback as SiteContent);
	return { content };
};
