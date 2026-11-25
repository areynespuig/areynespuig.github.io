<script lang="ts">
	import { LANGS, type Lang, type SiteContent } from '../content/types';
	import { LANG_PATHS, UI, pick } from '../i18n';
	import { SITE } from '../config';
	import { absoluteUrl, safeHref } from '../content/urls';

	let { lang, content }: { lang: Lang; content: SiteContent } = $props();

	const LOCALES: Record<Lang, string> = { es: 'es_ES', ca: 'ca_ES', en: 'en_GB' };

	const person = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Person',
			name: content.profile.name,
			url: SITE.url + LANG_PATHS[lang],
			image: absoluteUrl(content.profile.photo),
			description: pick(content.hero.subtitle, lang),
			sameAs: [content.profile.linkedin, content.profile.github].filter((u) => safeHref(u))
		}).replace(/</g, '\\u003c')
	);
</script>

<svelte:head>
	<title>{UI[lang].title}</title>
	<meta name="description" content={UI[lang].description} />
	<link rel="canonical" href={SITE.url + LANG_PATHS[lang]} />
	{#each LANGS as l (l)}
		<link rel="alternate" hreflang={l} href={SITE.url + LANG_PATHS[l]} />
	{/each}
	<link rel="alternate" hreflang="x-default" href={SITE.url + '/'} />
	<meta property="og:type" content="profile" />
	<meta property="og:title" content={UI[lang].title} />
	<meta property="og:description" content={pick(content.hero.subtitle, lang)} />
	<meta property="og:url" content={SITE.url + LANG_PATHS[lang]} />
	<meta property="og:image" content={absoluteUrl(content.profile.photo)} />
	<meta property="og:locale" content={LOCALES[lang]} />
	<meta name="theme-color" content="#2346e8" />
	{@html `<script type="application/ld+json">${person}</script>`}
</svelte:head>
