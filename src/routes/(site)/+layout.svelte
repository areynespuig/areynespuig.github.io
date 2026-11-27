<script lang="ts">
	import './site.css';
	import { onNavigate } from '$app/navigation';
	import SiteTerminal from '#lib/components/SiteTerminal.svelte';
	import { liveContent } from '#lib/content/live.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	// El terminal vive aquí y no en cada página: sigue abierto, con lo escrito, al ir de una página a otra.
	const content = liveContent(() => data.content);

	// Al cambiar de idioma, la página pasa de una versión a otra con una transición suave.
	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

{@render children()}
<SiteTerminal content={content.current} />
