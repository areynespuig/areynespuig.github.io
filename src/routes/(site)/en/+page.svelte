<script lang="ts">
	import Portfolio from '#lib/components/Portfolio.svelte';
	import SiteHead from '#lib/components/SiteHead.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<SiteHead lang="en" content={data.content} />
<Portfolio lang="en" content={data.content} />
