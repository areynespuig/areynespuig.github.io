<script lang="ts">
	import { lookInfo, normalizeAppearance } from '../content/appearance';
	import { chooseLook, look } from '../content/look.svelte';
	import type { Lang, SiteContent } from '../content/types';
	import { UI } from '../i18n';

	/** Selector de tema para los visitantes: solo aparece si el CMS ofrece más de uno. */
	let { content, lang }: { content: SiteContent; lang: Lang } = $props();

	const ui = $derived(UI[lang]);
	const appearance = $derived(normalizeAppearance(content.appearance));
	let menu = $state<HTMLElement>();

	function pick(id: string) {
		chooseLook(id, content.appearance);
		menu?.hidePopover();
	}
</script>

{#if appearance.choices.length > 1}
	<button type="button" class="look-btn" popovertarget="look-menu" aria-label={ui.themeLabel} title={ui.themeLabel}>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2z"></path><circle cx="7.5" cy="10.5" r="1"></circle><circle cx="10.5" cy="7" r="1"></circle><circle cx="15" cy="7.5" r="1"></circle></svg>
	</button>
	<div bind:this={menu} id="look-menu" class="look-menu" popover="auto" aria-label={ui.themeLabel}>
		<p class="look-title">{ui.themeLabel}</p>
		<ul>
			{#each appearance.choices as id (id)}
				{@const info = lookInfo(appearance, id)}
				<li>
					<button type="button" aria-pressed={(look.current ?? appearance.theme) === id} onclick={() => pick(id)}>
						<span class="sw" aria-hidden="true">
							{#each info.swatches as color, i (i)}<i style:background={color}></i>{/each}
						</span>
						{info.name(lang)}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.look-btn {
		anchor-name: --look-btn;
		width: 40px;
		height: 40px;
		flex: none;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
		transition:
			border-color 0.2s,
			transform 0.12s var(--ease-out);
	}
	.look-btn:hover {
		border-color: color-mix(in oklch, var(--ink) 35%, var(--line));
	}
	.look-btn:active {
		transform: scale(0.94);
	}
	.look-btn:focus-visible,
	.look-menu button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
	/* El menú sale bajo el botón (posicionamiento por ancla); sin él, en la esquina de arriba. */
	.look-menu {
		position-anchor: --look-btn;
		inset: auto;
		top: anchor(bottom);
		right: anchor(right);
		margin: 0.5rem 0 0;
		min-width: 14rem;
		padding: 0.5rem;
		border: var(--bw) solid var(--line);
		border-radius: calc(var(--radius-card) * 0.6);
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow, none), 0 12px 32px rgb(0 0 0 / 0.14);
		font-family: var(--font-ui);
	}
	@supports not (anchor-name: --a) {
		.look-menu {
			position: fixed;
			top: 4.5rem;
			right: 1.25rem;
		}
	}
	.look-title {
		margin: 0.25rem 0.5rem 0.4rem;
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 600;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.look-menu button {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.5rem 0.6rem;
		border: 0;
		border-radius: calc(var(--radius-card) * 0.4);
		background: none;
		color: var(--ink);
		font: inherit;
		font-size: 0.9375rem;
		text-align: left;
		cursor: pointer;
	}
	.look-menu button:hover {
		background: var(--sunken);
	}
	.look-menu button[aria-pressed='true'] {
		background: var(--accent-soft);
		font-weight: 650;
	}
	.sw {
		display: inline-flex;
		flex: none;
	}
	.sw i {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.18);
	}
	.sw i + i {
		margin-left: -5px;
	}
</style>
