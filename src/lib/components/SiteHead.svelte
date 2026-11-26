<script lang="ts">
	import { LANGS, type Lang, type Project, type ProjectPage, type SiteContent } from '../content/types';
	import { LANG_PATHS, UI, pick } from '../i18n';
	import { SITE } from '../config';
	import { absoluteUrl, safeHref } from '../content/urls';
	import { hasText } from '../content/sections';
	import { projectPath } from '../content/project-pages';

	let {
		lang,
		content,
		project
	}: {
		lang: Lang;
		content: SiteContent;
		/** En la página de un proyecto, sus datos; sin él, es la portada. */
		project?: Project & { page: ProjectPage };
	} = $props();

	const LOCALES: Record<Lang, string> = { es: 'es_ES', ca: 'ca_ES', en: 'en_GB' };

	const path = (l: Lang) => (project ? projectPath(l, project.page.slug) : LANG_PATHS[l]);
	const title = $derived(project ? `${project.title} | ${content.profile.name}` : UI[lang].title);
	const description = $derived(
		project
			? pick(hasText(project.page.intro) ? project.page.intro : project.description, lang)
			: UI[lang].description
	);
	const shareText = $derived(project ? description : pick(content.hero.subtitle, lang));
	const image = $derived(absoluteUrl(project?.image || content.profile.photo));

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
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={SITE.url + path(lang)} />
	{#each LANGS as l (l)}
		<link rel="alternate" hreflang={l} href={SITE.url + path(l)} />
	{/each}
	<link rel="alternate" hreflang="x-default" href={SITE.url + path('es')} />
	<meta property="og:type" content={project ? 'article' : 'profile'} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={shareText} />
	<meta property="og:url" content={SITE.url + path(lang)} />
	<meta property="og:image" content={image} />
	<meta property="og:locale" content={LOCALES[lang]} />
	<meta name="theme-color" content="#2346e8" />
	{#if !project}
		{@html `<script type="application/ld+json">${person}</script>`}
	{/if}
</svelte:head>
