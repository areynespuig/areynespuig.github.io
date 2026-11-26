<script lang="ts">
	import '@fontsource-variable/bricolage-grotesque/standard.css';
	import '@fontsource-variable/atkinson-hyperlegible-next/index.css';
	import './site-theme.css';
	import { LANGS, type L10n, type Lang, type Project, type ProjectPage, type SiteContent } from '../content/types';
	import { LANG_NAMES, LANG_PATHS, UI, pick } from '../i18n';
	import { hasText, paragraphs } from '../content/sections';
	import { projectPath } from '../content/project-pages';
	import { safeHref } from '../content/urls';
	import Editable from './Editable.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { useEditor } from './editor-context';

	let {
		content,
		project,
		lang,
		scheme
	}: {
		content: SiteContent;
		project: Project & { page: ProjectPage };
		lang: Lang;
		/** Fuerza tema claro u oscuro (lo usa el editor). */
		scheme?: 'light' | 'dark';
	} = $props();

	const editor = useEditor();
	const editing = !!editor;
	const ui = $derived(UI[lang]);
	const page = $derived(project.page);
	/** Sin introducción propia, la página usa la descripción de la tarjeta. */
	const intro = $derived(hasText(page.intro) ? page.intro : project.description);

	function text(value: L10n): string {
		return editing ? value[lang] : pick(value, lang);
	}
	function missing(value: L10n): boolean {
		return editing && !value[lang]?.trim();
	}
	function asset(src: string): string {
		return editor ? editor.asset(src) : src;
	}
	function link(url: string): string | undefined {
		return editor ? editor.asset(url) : safeHref(url);
	}
</script>

{#snippet say(value: L10n)}
	{#if missing(value)}<span class="missing">{ui.missing}</span>{:else}{text(value)}{/if}
{/snippet}

<div class={['site', editing && 'editing']} style:color-scheme={scheme} {lang}>
	{#if !editing}
		<a class="skip" href="#contenido">{ui.skip}</a>
	{/if}

	<header class="hero">
		<div class="wrap">
			<div class="bar">
				{#if editing}
					<span class="brand">Albert Reynés</span>
				{:else}
					<a class="brand" href={LANG_PATHS[lang]}>Albert Reynés</a>
					<ThemeToggle {lang} />
				{/if}
			</div>

			{#if editor}
				<button type="button" class="back" onclick={() => editor.openHome()}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>
					{ui.backToProjects}
				</button>
			{:else}
				<a class="back" href={`${LANG_PATHS[lang]}#proyectos`}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>
					{ui.backToProjects}
				</a>
			{/if}

			<Editable target={`projects:${project.id}`} label="Nombre, año y enlace del proyecto" as="div" block>
				<h1 class="title">{project.title || (editing ? 'Proyecto sin nombre' : '')}</h1>
			</Editable>
			<Editable target={`page:${project.id}`} label="Introducción y dirección de la página" as="div" block>
				<p class="lead">{@render say(intro)}</p>
			</Editable>
			{#if project.url || project.year}
				<Editable target={`projects:${project.id}`} label="Nombre, año y enlace del proyecto" as="div" block>
					<div class="actions">
						{#if project.url}
							<a class="btn" href={link(project.url)} target="_blank" rel="noopener">
								{ui.viewProject}<span class="visually-hidden"> {ui.newTab}</span>
							</a>
						{/if}
						{#if project.year}<span class="year">{project.year}</span>{/if}
					</div>
				</Editable>
			{/if}
		</div>
	</header>

	<svelte:element this={editing ? 'div' : 'main'} id="contenido" class="body">
		<div class="wrap">
			{#if page.blocks.length}
				<svelte:element this={page.steps ? 'ol' : 'div'} class="blocks">
					{#each page.blocks as block, i (block.id)}
						<svelte:element this={page.steps ? 'li' : 'section'} class="item">
							<Editable target={`page:${project.id}/${block.id}`} label={pick(block.title, lang) || 'Bloque sin título'} as="div" block>
								<div class={['step', page.steps ? 'numbered' : 'gallery', block.image && 'has-image']}>
									{#if page.steps}<span class="num" aria-hidden="true">{i + 1}</span>{/if}
									<div class="step-body">
										<h2>
											{#if page.steps}<span class="visually-hidden">{`${ui.step} ${i + 1}: `}</span>{/if}{@render say(block.title)}
										</h2>
										{#if hasText(block.body)}
											{#if missing(block.body)}
												<p class="missing">{ui.missing}</p>
											{:else}
												{#each paragraphs(text(block.body)) as paragraph, j (j)}
													<p>{paragraph}</p>
												{/each}
											{/if}
										{/if}
										{#if block.image && page.steps}
											<figure>
												<img src={asset(block.image)} alt={pick(block.imageAlt, lang)} loading="lazy" />
											</figure>
										{/if}
									</div>
									<!-- Sin numerar, la imagen es la protagonista: va al lado del texto y se abre a tamaño completo. -->
									{#if block.image && !page.steps}
										<figure class="shot">
											{#if editing}
												<img src={asset(block.image)} alt={pick(block.imageAlt, lang)} />
											{:else}
												<a href={block.image} target="_blank" rel="noopener">
													<img src={block.image} alt={pick(block.imageAlt, lang)} loading="lazy" />
													<span class="visually-hidden">{ui.newTab}</span>
												</a>
											{/if}
										</figure>
									{/if}
								</div>
							</Editable>
						</svelte:element>
					{/each}
				</svelte:element>
			{:else if editing}
				<p class="placeholder">La página aún no tiene contenido. Añade el primer {page.steps ? 'paso' : 'bloque'} con el botón de abajo.</p>
			{/if}
			{#if editor}
				<button type="button" class="add-item" onclick={() => editor.addPageBlock(project.id)}>
					{page.steps ? 'Añadir paso' : 'Añadir bloque'}
				</button>
			{/if}
		</div>
	</svelte:element>

	<footer class="foot">
		<div class="wrap foot-grid">
			<p>© 2026 {content.profile.name}</p>
			{#if !editing}
				<ul class="foot-links" aria-label={ui.langLabel}>
					{#each LANGS as l (l)}
						<li>
							<a href={projectPath(l, page.slug)} hreflang={l} lang={l} aria-current={l === lang ? 'page' : undefined}>{LANG_NAMES[l]}</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</footer>
</div>

<style>
	.site {
		position: relative;
		container: site / inline-size;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	.site.editing {
		min-height: 0;
	}
	.site :where(h1, h2, p, ol, figure) {
		margin: 0;
	}
	.wrap {
		width: min(100% - 2.5rem, 76rem);
		margin-inline: auto;
	}
	@container site (width >= 48rem) {
		.wrap {
			width: min(100% - 5rem, 76rem);
		}
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.skip {
		position: absolute;
		left: 1rem;
		top: -4rem;
		z-index: 10;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		background: var(--hero-ink);
		color: #111316;
		font-weight: 700;
	}
	.skip:focus {
		top: 1rem;
	}
	.missing {
		font-style: italic;
		opacity: 0.75;
	}

	/* Cabecera */
	.hero {
		background: var(--hero);
		color: var(--hero-ink);
		padding-block: 1rem clamp(2.75rem, 6cqi, 4.5rem);
	}
	.hero :focus-visible {
		outline: 3px solid var(--hero-ink);
		outline-offset: 3px;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 3rem;
	}
	.brand {
		font-family: var(--display);
		font-weight: 700;
		font-stretch: 75%;
		font-size: 1.3rem;
		letter-spacing: 0.01em;
		color: var(--hero-ink);
		text-decoration: none;
	}
	.back {
		margin-top: clamp(2rem, 6cqi, 4rem);
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0;
		border: 0;
		background: none;
		color: var(--hero-soft);
		font: inherit;
		font-weight: 700;
		font-size: 0.95rem;
		text-decoration: none;
		cursor: pointer;
	}
	.back:hover {
		color: var(--hero-ink);
		text-decoration: underline;
		text-underline-offset: 0.3em;
	}
	.title {
		margin-top: 0.75rem;
		font-family: var(--display);
		font-weight: 800;
		font-stretch: 75%;
		text-transform: uppercase;
		font-size: clamp(2.75rem, 10cqi, 8.5rem);
		line-height: 0.9;
		letter-spacing: -0.005em;
		text-wrap: balance;
		overflow-wrap: break-word;
	}
	.lead {
		margin-top: clamp(1.25rem, 3cqi, 2rem);
		max-width: 44ch;
		color: var(--hero-soft);
		font-size: clamp(1.15rem, 2cqi, 1.45rem);
		line-height: 1.45;
		text-wrap: pretty;
	}
	.actions {
		margin-top: 2rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
	}
	.btn {
		min-height: 48px;
		padding: 0 1.25rem;
		display: inline-flex;
		align-items: center;
		border-radius: 10px;
		background: var(--hero-ink);
		color: var(--hero);
		font-weight: 700;
		text-decoration: none;
	}
	.btn:hover {
		background: color-mix(in oklch, var(--hero-ink) 86%, var(--hero));
	}
	.year {
		font-family: var(--display);
		font-weight: 700;
		font-stretch: 75%;
		font-size: 1.5rem;
		color: var(--hero-soft);
	}

	/* Bloques */
	.body {
		flex: 1;
		padding-block: clamp(2.5rem, 6cqi, 5rem);
	}
	.body :focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}
	.blocks {
		list-style: none;
		padding: 0;
	}
	.item + .item {
		border-top: 1px solid var(--line);
	}
	.step {
		display: grid;
		gap: 0.25rem;
		padding-block: 2rem;
	}
	.item:first-child .step {
		padding-top: 0;
	}
	@container site (width >= 48rem) {
		.step.numbered {
			grid-template-columns: 7rem minmax(0, 46rem);
			column-gap: 2rem;
		}
		.step:not(.numbered) .step-body {
			max-width: 46rem;
		}
	}
	.num {
		font-family: var(--display);
		font-weight: 800;
		font-stretch: 75%;
		font-size: clamp(2.5rem, 6cqi, 4.5rem);
		line-height: 0.9;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.step-body h2 {
		font-size: clamp(1.3rem, 2.2cqi, 1.65rem);
		line-height: 1.25;
		font-weight: 700;
		text-wrap: balance;
	}
	.step-body p {
		max-width: 62ch;
		white-space: pre-line;
		text-wrap: pretty;
	}
	.step.gallery {
		gap: 1.25rem;
		padding-block: 2.5rem;
	}
	@container site (width >= 60rem) {
		.step.gallery.has-image {
			grid-template-columns: 17rem minmax(0, 1fr);
			column-gap: 3rem;
			align-items: start;
		}
		.step.gallery.has-image .step-body {
			position: sticky;
			top: 1.5rem;
		}
	}
	.shot {
		border: 1px solid var(--line);
		border-radius: 12px;
		overflow: hidden;
		background: var(--sunken);
		box-shadow: 0 1px 2px color-mix(in oklch, var(--ink) 8%, transparent);
	}
	.shot a {
		display: block;
		cursor: zoom-in;
	}
	.shot img {
		display: block;
		width: 100%;
		height: auto;
	}
	.step-body figure {
		margin-top: 0.75rem;
		border: 1px solid var(--line);
		border-radius: 12px;
		overflow: hidden;
		background: var(--sunken);
	}
	.step-body figure img {
		display: block;
		width: 100%;
		height: auto;
	}
	.placeholder {
		color: var(--muted);
		font-style: italic;
	}
	.add-item {
		width: 100%;
		min-height: 48px;
		margin-top: 1.5rem;
		border: 2px dashed var(--line);
		border-radius: 12px;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.add-item:hover {
		border-color: oklch(0.8 0.17 85);
		color: var(--ink);
	}

	/* Pie */
	.foot {
		border-top: 1px solid var(--line);
		padding-block: 2.5rem 3rem;
		color: var(--muted);
		font-size: 0.95rem;
	}
	.foot-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem 2.5rem;
	}
	.foot-links {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
	}
	.foot a {
		color: var(--ink);
		text-underline-offset: 0.25em;
		display: inline-block;
		padding-block: 0.35rem;
	}
	.foot a[aria-current='page'] {
		font-weight: 700;
		text-decoration: none;
	}
	.foot :focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}

	@media (prefers-reduced-motion: no-preference) {
		.site:not(.editing) .title {
			animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(0.25em);
		}
	}
</style>
