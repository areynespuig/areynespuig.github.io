import type { Handle } from '@sveltejs/kit/hooks';

/** Pone el idioma correcto en <html lang> de cada página generada. */
export const handle: Handle = ({ event, resolve }) => {
	const path = event.url.pathname;
	const lang = path.startsWith('/ca/') || path === '/ca' ? 'ca' : path.startsWith('/en/') || path === '/en' ? 'en' : 'es';
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});
};
