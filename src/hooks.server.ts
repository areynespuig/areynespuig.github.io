import type { Handle } from '@sveltejs/kit/hooks';
import { langFromPath } from '#lib/i18n.ts';

/** Pone el idioma correcto en <html lang> de cada página generada. */
export const handle: Handle = ({ event, resolve }) => {
	const lang = langFromPath(event.url.pathname);
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});
};
