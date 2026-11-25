import { onMount } from 'svelte';
import { fetchLatestContent } from './remote';
import type { SiteContent } from './types';

/**
 * Contenido de la página: empieza con el que se generó en el HTML (rápido y visible para
 * buscadores) y, al abrirse, se sustituye por la última versión de Supabase si es distinta.
 */
export function liveContent(initial: () => SiteContent) {
	let latest = $state<SiteContent | null>(null);

	onMount(() => {
		let active = true;
		fetchLatestContent().then((content) => {
			if (active && content && JSON.stringify(content) !== JSON.stringify(initial())) latest = content;
		});
		return () => {
			active = false;
		};
	});

	return {
		get current(): SiteContent {
			return latest ?? initial();
		}
	};
}
