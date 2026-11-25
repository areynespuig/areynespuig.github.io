<script lang="ts">
	import Portfolio from '#lib/components/Portfolio.svelte';
	import SiteHead from '#lib/components/SiteHead.svelte';
	import data from '#lib/content/site.json';
	import type { SiteContent } from '#lib/content/types.ts';

	const content = data as SiteContent;
</script>

<SiteHead lang="ca" {content} />
<Portfolio lang="ca" {content} />
