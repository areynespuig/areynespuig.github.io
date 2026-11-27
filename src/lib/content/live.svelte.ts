import { onMount } from 'svelte';
import { fetchLatestContent } from './remote';
import type { SiteContent } from './types';

/**
 * Contenido de la página: empieza con el que se generó en el HTML (rápido y visible para
 * buscadores) y, al abrirse, se sustituye por la última versión de Supabase si es distinta.
 * El tema no: se decide antes de pintar con lo que trae el HTML, y cambiarlo con la página ya a la
 * vista sería un salto. Un tema recién publicado se ve al regenerarse la web.
 */
export function liveContent(initial: () => SiteContent) {
	let latest = $state<SiteContent | null>(null);

	onMount(() => {
		let active = true;
		fetchLatestContent().then((content) => {
			if (!active || !content) return;
			const fresh: SiteContent = { ...content, appearance: initial().appearance };
			if (JSON.stringify(fresh) !== JSON.stringify(initial())) latest = fresh;
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
