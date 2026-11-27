<script lang="ts">
	import type { Lang } from '../content/types';
	import { UI } from '../i18n';

	let { lang }: { lang: Lang } = $props();

	const ui = $derived(UI[lang]);
	let theme = $state<'light' | 'dark' | null>(null);
	let button = $state<HTMLButtonElement>();

	$effect(() => {
		const set = document.documentElement.dataset.theme;
		theme =
			set === 'light' || set === 'dark'
				? set
				: matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light';
	});

	function apply(next: 'light' | 'dark') {
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem('theme', next);
		} catch {
			/* sin almacenamiento: el cambio dura hasta recargar */
		}
		theme = next;
	}

	/** El tema nuevo se abre en círculo desde el botón; sin View Transitions o con movimiento reducido, cambia sin más. */
	function toggle() {
		const next = theme === 'dark' ? 'light' : 'dark';
		const root = document.documentElement;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.look === 'contraste';
		if (!document.startViewTransition || !button || still) {
			apply(next);
			return;
		}
		const box = button.getBoundingClientRect();
		const x = box.left + box.width / 2;
		const y = box.top + box.height / 2;
		const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
		root.dataset.themeSwitch = '';
		const transition = document.startViewTransition(() => apply(next));
		transition.ready
			.then(() => {
				root.animate(
					{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
					{ duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
				);
			})
			.catch(() => {});
		transition.finished.finally(() => delete root.dataset.themeSwitch);
	}
</script>

<button
	bind:this={button}
	type="button"
	class="theme"
	onclick={toggle}
	aria-label={theme === 'dark' ? ui.themeToLight : ui.themeToDark}
	title={theme === 'dark' ? ui.themeToLight : ui.themeToDark}
>
	{#if theme === 'dark'}
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
	{:else}
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>
	{/if}
</button>

<style>
	.theme {
		width: 40px;
		height: 40px;
		flex: none;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		display: grid;
		place-items: center;
		cursor: pointer;
		transition:
			border-color 0.2s,
			transform 0.12s var(--ease-out);
	}
	.theme:hover {
		border-color: color-mix(in oklch, var(--ink) 35%, var(--line));
	}
	.theme:active {
		transform: scale(0.94);
	}
	.theme:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
</style>
