<script lang="ts">
	import Portfolio from '#lib/components/Portfolio.svelte';
	import SiteHead from '#lib/components/SiteHead.svelte';
	import { liveContent } from '#lib/content/live.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const content = liveContent(() => data.content);
</script>

<SiteHead lang="en" content={content.current} />
<Portfolio lang="en" content={content.current} />
