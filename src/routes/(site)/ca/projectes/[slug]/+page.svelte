<script lang="ts">
	import ProjectPage from '#lib/components/ProjectPage.svelte';
	import SiteHead from '#lib/components/SiteHead.svelte';
	import { liveContent } from '#lib/content/live.svelte.ts';
	import { findPageProject } from '#lib/content/project-pages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const content = liveContent(() => data.content);
	// Si en la última versión publicada ya no está, se mantiene la que se generó.
	const project = $derived(findPageProject(content.current, data.slug) ?? findPageProject(data.content, data.slug)!);
</script>

<SiteHead lang="ca" content={content.current} {project} />
<ProjectPage lang="ca" content={content.current} {project} />
