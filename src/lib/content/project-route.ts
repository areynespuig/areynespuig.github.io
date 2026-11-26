import { error } from '@sveltejs/kit';
import { browser } from '$app/env';
import { findPageProject } from './project-pages';
import { fetchLatestContent } from './remote';
import type { SiteContent } from './types';

/**
 * Carga de /proyectos/<slug>/ (y sus versiones en catalán e inglés). Si el proyecto no está en el
 * contenido generado pero sí en el último publicado (una página nueva antes de regenerar la web),
 * se muestra igualmente.
 */
export async function loadProjectRoute({
	params,
	parent
}: {
	params: { slug: string };
	parent: () => Promise<{ content: SiteContent }>;
}): Promise<{ slug: string; content: SiteContent }> {
	const { content } = await parent();
	if (findPageProject(content, params.slug)) return { slug: params.slug, content };
	if (browser) {
		const latest = await fetchLatestContent();
		if (latest && findPageProject(latest, params.slug)) return { slug: params.slug, content: latest };
	}
	error(404, 'Not found');
}
