<script lang="ts">
	import '@fontsource-variable/albert-sans/index.css';
	import '#lib/components/site-theme.css';
	import { page } from '$app/state';
	import { LANG_PATHS, UI, langFromPath } from '#lib/i18n.ts';

	const lang = $derived(langFromPath(page.url.pathname));
	const ui = $derived(UI[lang]);
	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? ui.notFoundTitle : page.error?.message} | Albert Reynés Puig</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="site" {lang}>
	<div class="box">
		<p class="code">{page.status}</p>
		<h1>{notFound ? ui.notFoundTitle : page.error?.message}</h1>
		{#if notFound}<p>{ui.notFoundText}</p>{/if}
		<a href={LANG_PATHS[lang]}>{ui.goHome}</a>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
	}
	.site {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 2rem 1.25rem;
		box-sizing: border-box;
	}
	.box {
		max-width: 34rem;
	}
	.code {
		margin: 0;
		font-weight: 300;
		letter-spacing: -0.05em;
		font-size: clamp(4rem, 18vw, 8rem);
		line-height: 0.9;
		color: var(--accent);
	}
	h1 {
		margin: 1rem 0 0;
		font-size: clamp(1.5rem, 4vw, 2rem);
		line-height: 1.2;
	}
	p {
		margin: 0.75rem 0 0;
		color: var(--muted);
	}
	a {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.75rem 1.25rem;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 700;
		text-decoration: none;
	}
	a:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}
</style>
