<script lang="ts">
	import type { Lang } from '../content/types';
	import { UI } from '../i18n';

	let { lang }: { lang: Lang } = $props();

	const ui = $derived(UI[lang]);
	let theme = $state<'light' | 'dark' | null>(null);

	$effect(() => {
		const set = document.documentElement.dataset.theme;
		theme =
			set === 'light' || set === 'dark'
				? set
				: matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
	});

	function toggle() {
		const next = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem('theme', next);
		} catch {
			/* sin almacenamiento: el cambio dura hasta recargar */
		}
		theme = next;
	}
</script>

<button
	type="button"
	class="theme"
	onclick={toggle}
	aria-label={theme === 'dark' ? ui.themeToLight : ui.themeToDark}
	title={theme === 'dark' ? ui.themeToLight : ui.themeToDark}
>
	{#if theme === 'dark'}
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
	{:else}
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>
	{/if}
</button>

<style>
	.theme {
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: 50%;
		border: 1.5px solid color-mix(in oklch, var(--hero-ink) 45%, transparent);
		background: transparent;
		color: var(--hero-ink);
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.theme:hover {
		border-color: var(--hero-ink);
	}
	.theme:focus-visible {
		outline: 3px solid var(--hero-ink);
		outline-offset: 3px;
	}
</style>
