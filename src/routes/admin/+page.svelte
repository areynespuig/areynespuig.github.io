<script lang="ts">
	import '@fontsource-variable/albert-sans/index.css';
	import { onMount } from 'svelte';
	import { dev } from '$app/env';
	import Portfolio from '#lib/components/Portfolio.svelte';
	import { provideEditor } from '#lib/components/editor-context.ts';
	import { Editor } from '#lib/admin/editor.svelte.ts';
	import Gate from '#lib/admin/Gate.svelte';
	import Sidebar from '#lib/admin/Sidebar.svelte';
	import Inspector from '#lib/admin/Inspector.svelte';
	import { LANGS } from '#lib/content/types.ts';
	import { LANG_NAMES, LANG_PATHS } from '#lib/i18n.ts';
	import { SITE } from '#lib/config.ts';

	const editor = new Editor();
	provideEditor({
		isSelected: (t) => editor.selected === t,
		isFlagged: (t) => editor.isFlagged(t),
		select: (t) => editor.select(t),
		add: (c) => editor.add(c),
		asset: (s) => editor.asset(s)
	});

	onMount(() => {
		// En desarrollo local se puede editar sin Supabase (sin publicar): si no está configurado,
		// o abriendo /admin/?local para probar sin iniciar sesión.
		editor.init({ allowOffline: dev, forceOffline: dev && new URL(location.href).searchParams.has('local') });
	});

	// Guarda el borrador en el navegador cada vez que cambia algo.
	$effect(() => {
		editor.persist();
	});

	const host = SITE.url.replace(/^https?:\/\//, '');
	let stageWidth = $state(0);
	const deviceWidth = $derived(editor.device === 'mobile' ? 390 : 1280);
	const zoom = $derived(stageWidth ? Math.min(1, (stageWidth - 48) / deviceWidth) : 1);
	const statusText = $derived(
		!editor.ready
			? 'Cargando…'
			: editor.changes === 0
				? 'Todo publicado'
				: editor.changes === 1
					? '1 cambio sin publicar'
					: `${editor.changes} cambios sin publicar`
	);
</script>

<svelte:head>
	<title>Editor del portafolio</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class={['cms', editor.phase !== 'ready' && 'is-gate']}>
	{#if editor.phase !== 'ready'}
		<Gate {editor} />
	{:else}
	<header class="top">
		<div class="brand">
			<strong>Portafolio de Albert</strong>
			<span>Se publica en {host}</span>
		</div>
		<div class="ctrls">
			<div class="ctrl">
				<span id="lang-l">Idioma de la vista</span>
				<div class="seg" role="group" aria-labelledby="lang-l">
					{#each LANGS as l (l)}
						<button type="button" aria-pressed={editor.lang === l} title={LANG_NAMES[l]} onclick={() => (editor.lang = l)}>
							{l.toUpperCase()}
						</button>
					{/each}
				</div>
			</div>
			<div class="ctrl">
				<span id="dev-l">Pantalla</span>
				<div class="seg" role="group" aria-labelledby="dev-l">
					<button type="button" aria-pressed={editor.device === 'desktop'} onclick={() => (editor.device = 'desktop')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5"></rect><path d="M8 20h8M12 16v4"></path></svg>
						Escritorio
					</button>
					<button type="button" aria-pressed={editor.device === 'mobile'} onclick={() => (editor.device = 'mobile')}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"></rect><path d="M11 18.5h2"></path></svg>
						Móvil
					</button>
				</div>
			</div>
			<div class="ctrl">
				<span id="sch-l">Tema</span>
				<div class="seg" role="group" aria-labelledby="sch-l">
					<button type="button" aria-pressed={editor.scheme === 'light'} onclick={() => (editor.scheme = 'light')}>Claro</button>
					<button type="button" aria-pressed={editor.scheme === 'dark'} onclick={() => (editor.scheme = 'dark')}>Oscuro</button>
				</div>
			</div>
		</div>
		<div class="pub">
			<span class={['state', editor.changes > 0 && 'has']} role="status">{statusText}</span>
			<button type="button" class="btn" disabled={!editor.changes || editor.busy} onclick={() => editor.discard()}>Descartar</button>
			<button
				type="button"
				class="btn btn-pub"
				disabled={!editor.changes || editor.busy || editor.offline}
				title={editor.offline ? 'En modo local no se puede publicar' : undefined}
				onclick={() => editor.publish()}
			>
				{editor.busy ? 'Publicando…' : 'Publicar'}
			</button>
		</div>
	</header>

	<div class="work">
		<Sidebar {editor} />
		<section class="stage" aria-label="Vista previa de la web" bind:clientWidth={stageWidth}>
			<div class="frame" style:width="{deviceWidth * zoom}px">
				<div class="url">
					<b>{host}{LANG_PATHS[editor.lang]}</b>
					<span>{editor.changes ? 'Vista previa con cambios sin publicar' : 'Igual que la web publicada'}</span>
				</div>
				<div class="viewport" style:width="{deviceWidth}px" style:zoom>
					<Portfolio content={editor.draft} lang={editor.lang} scheme={editor.scheme} />
				</div>
			</div>
		</section>
		<Inspector {editor} />
	</div>
	{/if}

	{#if editor.toast}
		<div class={['toast', editor.toast.tone]} role={editor.toast.tone === 'error' ? 'alert' : 'status'}>
			<span>{editor.toast.text}</span>
			<button type="button" aria-label="Cerrar aviso" onclick={() => (editor.toast = null)}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
			</button>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		overflow: hidden;
	}
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}
	.cms {
		--desk: #e3e5eb;
		--panel: #f7f8fa;
		--ink: #23253a;
		--muted: #555b6e;
		--line: #cdd1da;
		--marker: #f5b700;
		height: 100dvh;
		overflow: clip;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		font-family: 'Albert Sans Variable', system-ui, sans-serif;
		font-size: 14px;
		line-height: 1.45;
		color: var(--ink);
		background: var(--desk);
		color-scheme: light;
	}
	.cms.is-gate {
		display: block;
		overflow: auto;
	}
	.cms :global(:focus-visible) {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}

	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 24px;
		padding: 10px 20px;
		background: var(--panel);
		border-bottom: 1px solid var(--line);
	}
	.brand {
		flex: 1 1 180px;
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}
	.brand strong {
		font-size: 16px;
		font-weight: 700;
	}
	.brand span {
		font-size: 13px;
		color: var(--muted);
	}
	.ctrls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
	}
	.ctrl {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--muted);
	}
	.seg {
		display: inline-flex;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 2px;
		background: #fff;
	}
	.seg button {
		appearance: none;
		border: 0;
		background: transparent;
		font: inherit;
		font-weight: 600;
		color: var(--muted);
		padding: 0 12px;
		min-height: 38px;
		border-radius: 6px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.seg button[aria-pressed='true'] {
		background: var(--ink);
		color: #fff;
	}
	.pub {
		flex: 1 1 260px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
	}
	.state {
		font-size: 13px;
		color: var(--muted);
		margin-right: 4px;
	}
	.state.has {
		color: var(--ink);
		font-weight: 600;
	}
	.btn {
		appearance: none;
		min-height: 44px;
		padding: 0 18px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.btn:hover:not(:disabled) {
		border-color: var(--ink);
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.btn-pub {
		background: var(--marker);
		border-color: #d9a200;
	}

	.work {
		display: grid;
		grid-template-columns: 16rem minmax(0, 1fr) 23rem;
		min-height: 0;
	}
	.stage {
		min-width: 0;
		overflow: auto;
		padding: 24px;
		overscroll-behavior: contain;
	}
	.frame {
		margin: 0 auto;
		border-radius: 10px;
		overflow: clip;
		box-shadow:
			0 0 0 1px var(--line),
			0 14px 36px rgba(35, 37, 58, 0.18);
		background: #fff;
	}
	.url {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 4px 12px;
		padding: 8px 14px;
		background: #2b2e44;
		color: #d3d6e6;
		font-size: 12px;
	}
	.url b {
		font-weight: 600;
		color: #fff;
	}
	.viewport {
		overflow: clip;
	}

	.toast {
		position: fixed;
		left: 50%;
		bottom: 24px;
		translate: -50% 0;
		z-index: 20;
		max-width: min(36rem, calc(100vw - 2rem));
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 10px 10px 18px;
		border-radius: 10px;
		background: var(--ink);
		color: #fff;
		font-weight: 600;
		box-shadow: 0 10px 30px rgba(35, 37, 58, 0.3);
	}
	.toast.error {
		background: #8a1f14;
	}
	.toast button {
		flex: none;
		width: 36px;
		height: 36px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.toast button:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	@media (width < 1100px) {
		:global(body) {
			overflow: auto;
		}
		.cms {
			height: auto;
			min-height: 100dvh;
			overflow: visible;
		}
		.work {
			grid-template-columns: minmax(0, 1fr);
		}
		.work > :global(.side) {
			order: 2;
		}
		.stage {
			max-height: 75dvh;
		}
	}
</style>
