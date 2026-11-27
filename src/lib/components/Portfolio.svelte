<script lang="ts">
	import '@fontsource-variable/albert-sans/index.css';
	import {
		LANGS,
		SECTION_LAYOUTS,
		type BuiltinSection,
		type CustomSection,
		type L10n,
		type L10nList,
		type Lang,
		type SiteContent
	} from '../content/types';
	import { LANG_NAMES, LANG_PATHS, UI, pick, pickList } from '../i18n';
	import Editable from './Editable.svelte';
	import { useEditor } from './editor-context';
	import { safeHref } from '../content/urls';
	import { frameTransform } from '../content/photo';
	import { hasText, isBuiltin, LAYOUT_INFO, paragraphs, sectionOrder, sectionVisible } from '../content/sections';
	import { isValidSlug, projectPath } from '../content/project-pages';
	import ThemeToggle from './ThemeToggle.svelte';
	import './site-theme.css';
	import './themes.css';
	import LookPicker from './LookPicker.svelte';
	import { syncLook } from '../content/look.svelte';
	import { lookInfo, normalizeAppearance } from '../content/appearance';

	let {
		content,
		lang,
		scheme,
		previewLook
	}: {
		content: SiteContent;
		lang: Lang;
		/** Fuerza tema claro u oscuro (lo usa el editor). Sin valor, sigue al sistema o a la elección del visitante. */
		scheme?: 'light' | 'dark';
		/** En el editor, la plantilla que se está editando; sin valor, la principal. */
		previewLook?: string;
	} = $props();

	const editor = useEditor();
	const editing = !!editor;
	const ui = $derived(UI[lang]);
	const appearance = $derived(normalizeAppearance(content.appearance));
	const preview = $derived(lookInfo(appearance, previewLook ?? appearance.theme));
	// En la web, el tema va en <html> (lo pone /theme.js antes de pintar); aquí se repite al abrir y
	// cuando llega el contenido más reciente. En el editor, la vista previa lo lleva en el propio `.site`.
	$effect(() => {
		if (!editing) syncLook(content.appearance);
	});

	/** En la barra: nombre y primer apellido. */
	const brandName = $derived(content.profile.name.trim().split(/\s+/).slice(0, 2).join(' '));

	const nameParts = $derived.by(() => {
		const words = content.profile.name.trim().split(/\s+/);
		return { first: words[0] ?? '', rest: words.slice(1).join(' ') };
	});

	/** Proporción de la foto para reservar su hueco antes de que cargue (sin datos, 4:5). */
	const photoSize = $derived.by(() => {
		const d = content.profile.photoDimensions;
		return d && d.width > 0 && d.height > 0 ? d : { width: 480, height: 600 };
	});

	const skills = $derived(list(content.about.skills));

	const BUILTIN_NAV: Record<BuiltinSection, keyof (typeof UI)['es']['nav']> = {
		sobre: 'about',
		educacion: 'education',
		experiencia: 'experience',
		proyectos: 'projects'
	};
	const custom = $derived(new Map((content.sections ?? []).map((s) => [s.id, s])));
	/** Secciones bajo la portada, en orden. En la web, las nuevas solo aparecen con título y contenido. */
	const shown = $derived(
		sectionOrder(content).filter((id) => {
			if (isBuiltin(id)) return true;
			const s = custom.get(id);
			return !!s && (editing || sectionVisible(s));
		})
	);
	/** Letras de la palabra más larga: con títulos largos, el tamaño se ajusta a la columna. */
	function longestWord(value: string): number {
		return Math.max(1, ...value.split(/\s+/).map((w) => w.length));
	}
	function sectionTitle(id: string): string {
		if (isBuiltin(id)) return ui.nav[BUILTIN_NAV[id]];
		const s = custom.get(id);
		return (s && pick(s.title, lang)) || 'Sección sin título';
	}

	/** En el editor se ve lo que hay en cada idioma; en la web, si falta, se usa otro idioma. */
	function text(value: L10n): string {
		return editing ? value[lang] : pick(value, lang);
	}
	function list(value: L10nList): string[] {
		return editing ? (value[lang] ?? []).filter((s) => s.trim() !== '') : pickList(value, lang);
	}
	function missing(value: L10n): boolean {
		return editing && !value[lang]?.trim();
	}
	function asset(src: string): string {
		return editor ? editor.asset(src) : src;
	}
	/** Enlaces del contenido: en la web solo se aceptan http(s) y mailto. */
	function link(url: string): string | undefined {
		return editor ? editor.asset(url) : safeHref(url);
	}
	function years(start: number | null, end: number | null, ongoing: boolean): string {
		if (start == null) return '';
		if (ongoing) return `${start}–${ui.present}`;
		if (end == null || end === start) return String(start);
		return `${start}–${end}`;
	}

	// Menú: marca la sección que se está leyendo con una píldora que se desliza (solo en la web).
	let navEl = $state<HTMLElement>();
	let activeId = $state<string | null>(null);
	let pill = $state({ x: 0, y: 0, w: 0, h: 0, shown: false, ready: false });

	$effect(() => {
		if (editing) return;
		const targets = ['inicio', ...shown]
			.map((id) => document.getElementById(id))
			.filter((el): el is HTMLElement => !!el);
		// La sección activa es la que cruza una franja estrecha a un tercio de la altura de la ventana.
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) if (entry.isIntersecting) activeId = entry.target.id;
			},
			{ rootMargin: '-35% 0px -60% 0px' }
		);
		for (const el of targets) observer.observe(el);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (editing || !navEl) return;
		const nav = navEl;
		const place = () => {
			const link = activeId ? nav.querySelector<HTMLElement>(`a[data-id="${CSS.escape(activeId)}"]`) : null;
			if (!link) {
				pill.shown = false;
				return;
			}
			pill.x = link.offsetLeft;
			pill.y = link.offsetTop;
			pill.w = link.offsetWidth;
			pill.h = link.offsetHeight;
			pill.shown = true;
			// La primera vez aparece en su sitio; después ya se desliza.
			if (!pill.ready) requestAnimationFrame(() => (pill.ready = true));
		};
		place();
		const resize = new ResizeObserver(place);
		resize.observe(nav);
		return () => resize.disconnect();
	});

</script>

{#snippet say(value: L10n)}
	{#if missing(value)}<span class="missing">{ui.missing}</span>{:else}{text(value)}{/if}
{/snippet}

{#snippet cardImage(src: string, alt: L10n, name: string)}
	{#if src}
		<figure>
			<img src={asset(src)} alt={pick(alt, lang)} loading="lazy" />
		</figure>
	{:else if editing}
		<figure class="no-image"><span class="no-image-note">Sin imagen</span></figure>
	{:else}
		<figure class="no-image" aria-hidden="true"><span>{name}</span></figure>
	{/if}
{/snippet}

{#snippet heading(id: string)}
	<div class="block-head">
		<Editable target={`section:${id}`} label={`Sección ${sectionTitle(id)}`} as="div" block>
			<h2 id={`${id}-h`} style:--chars={longestWord(sectionTitle(id))}>
				{#if isBuiltin(id)}
					{sectionTitle(id)}
				{:else}
					{@const s = custom.get(id)}
					{#if s && (!editing || hasText(s.title))}
						{@render say(s.title)}
					{:else}
						<span class="missing">Sección sin título</span>
					{/if}
				{/if}
			</h2>
		</Editable>
	</div>
{/snippet}

{#snippet aboutBlock()}
	<section class="block" id="sobre" aria-labelledby="sobre-h">
		<div class="wrap block-grid">
			{@render heading('sobre')}
			<div>
				<Editable target="about.bio" label="Texto de presentación" as="div" block>
					<p class="bio">{@render say(content.about.bio)}</p>
				</Editable>
				<h3 class="skills-h">{ui.skills}</h3>
				<Editable target="about.skills" label={ui.skills} as="div" block>
					{#if skills.length}
						<ul class="skills">
							{#each skills as skill, i (i)}
								<li>{skill}</li>
							{/each}
						</ul>
					{:else}
						<p class="missing">{ui.missing}</p>
					{/if}
				</Editable>
			</div>
		</div>
	</section>
{/snippet}

{#snippet educationBlock()}
	<section class="block" id="educacion" aria-labelledby="educacion-h">
		<div class="wrap block-grid">
			{@render heading('educacion')}
			<div>
				<ol class="rows">
					{#each content.education as item (item.id)}
						<li>
							<Editable target={`education:${item.id}`} label={pick(item.title, lang) || 'Estudio sin título'} as="div" block>
								<div class="row">
									<p class="when">{years(item.start, item.end, item.ongoing)}</p>
									<div>
										<h3>{@render say(item.title)}</h3>
										<p class="org">{@render say(item.school)}</p>
									</div>
								</div>
							</Editable>
						</li>
					{/each}
				</ol>
				{#if editor}
					<button type="button" class="add-item" onclick={() => editor.add('education')}>Añadir estudio</button>
				{/if}
			</div>
		</div>
	</section>
{/snippet}

{#snippet experienceBlock()}
	<section class="block" id="experiencia" aria-labelledby="experiencia-h">
		<div class="wrap block-grid">
			{@render heading('experiencia')}
			<div>
				<ol class="rows">
					{#each content.experience as item (item.id)}
						<li>
							<Editable target={`experience:${item.id}`} label={pick(item.role, lang) || 'Experiencia sin título'} as="div" block>
								<div class="row">
									<div>
										<p class="when when-small">{@render say(item.kind)}</p>
										{#if item.start != null}
											<p class="when">{years(item.start, item.end, item.ongoing)}</p>
										{/if}
									</div>
									<div>
										<h3>{@render say(item.role)}</h3>
										{#if item.company}<p class="org">{item.company}</p>{/if}
										<p class="desc">{@render say(item.description)}</p>
									</div>
								</div>
							</Editable>
						</li>
					{/each}
				</ol>
				{#if editor}
					<button type="button" class="add-item" onclick={() => editor.add('experience')}>Añadir experiencia</button>
				{/if}
			</div>
		</div>
	</section>
{/snippet}

{#snippet projectsBlock()}
	<section class="block" id="proyectos" aria-labelledby="proyectos-h">
		<div class="wrap block-grid">
			{@render heading('proyectos')}
			<div>
				<ul class="cards">
					{#each content.projects as item (item.id)}
						<li>
							<Editable target={`projects:${item.id}`} label={item.title || 'Proyecto sin nombre'} as="div" block>
								<article class="card">
									{@render cardImage(item.image, item.imageAlt, item.title)}
									<div class="card-body">
										<h3 title={item.title} style:view-transition-name={editing ? undefined : `project-${item.id}`}>{item.title || (editing ? 'Proyecto sin nombre' : '')}</h3>
										<p class="year">{item.year ?? ''}</p>
										<p class="card-text" title={text(item.description)}>{@render say(item.description)}</p>
										<div class="card-links">
											{#if (item.page && isValidSlug(item.page.slug)) || item.url}
												{#if item.page && isValidSlug(item.page.slug)}
													<a class="card-page" href={projectPath(lang, item.page.slug)}>
														{ui.howItWorks}<span class="visually-hidden">: {item.title}</span>
													</a>
												{/if}
												{#if item.url}
													<a href={link(item.url)} target="_blank" rel="noopener">
														{ui.viewProject}<span class="visually-hidden"> {item.title} {ui.newTab}</span>
													</a>
												{/if}
											{/if}
										</div>
									</div>
								</article>
							</Editable>
						</li>
					{/each}
				</ul>
				{#if editor}
					<button type="button" class="add-item" onclick={() => editor.add('projects')}>Añadir proyecto</button>
				{/if}
			</div>
		</div>
	</section>
{/snippet}

{#snippet customBlock(s: CustomSection)}
	{@const target = `section:${s.id}`}
	{@const name = sectionTitle(s.id)}
	<section class="block" id={s.id} aria-labelledby={`${s.id}-h`}>
		<div class="wrap block-grid">
			{@render heading(s.id)}
			<div>
				{#if s.layout === 'text'}
					{@const points = list(s.points)}
					{@const anyPoints = LANGS.some((l) => s.points[l]?.some((p) => p.trim()))}
					<Editable {target} label={`Texto de ${name}`} as="div" block>
						{#if hasText(s.body)}
							{#if missing(s.body)}
								<p class="missing">{ui.missing}</p>
							{:else}
								<div class="prose">
									{#each paragraphs(text(s.body)) as paragraph, i (i)}
										<p>{paragraph}</p>
									{/each}
								</div>
							{/if}
						{/if}
						{#if points.length}
							<ul class={['skills', hasText(s.body) && 'after-text']}>
								{#each points as point, i (i)}
									<li>{point}</li>
								{/each}
							</ul>
						{:else if editing && anyPoints}
							<p class="missing after-text">{ui.missing}</p>
						{/if}
						{#if editing && !hasText(s.body) && !anyPoints}
							<p class="placeholder">Escribe el texto de la sección en el panel de la derecha.</p>
						{/if}
					</Editable>
				{:else}
					{#if hasText(s.body)}
						<Editable {target} label={`Introducción de ${name}`} as="div" block>
							<p class="lead">{@render say(s.body)}</p>
						</Editable>
					{/if}
					{#if s.items.length && s.layout === 'list'}
						<ol class="rows">
							{#each s.items as item (item.id)}
								<li>
									<Editable target={`${target}/${item.id}`} label={pick(item.title, lang) || 'Entrada sin título'} as="div" block>
										<div class="row">
											<p class="when">{years(item.start, item.end, item.ongoing)}</p>
											<div>
												<h3>{@render say(item.title)}</h3>
												{#if hasText(item.subtitle)}<p class="org">{@render say(item.subtitle)}</p>{/if}
												{#if hasText(item.description)}<p class="desc">{@render say(item.description)}</p>{/if}
												{#if item.url}
													<a class="more" href={link(item.url)} target="_blank" rel="noopener">
														{ui.more}<span class="visually-hidden"> {pick(item.title, lang)} {ui.newTab}</span>
													</a>
												{/if}
											</div>
										</div>
									</Editable>
								</li>
							{/each}
						</ol>
					{:else if s.items.length}
						<ul class="cards">
							{#each s.items as item (item.id)}
								<li>
									<Editable target={`${target}/${item.id}`} label={pick(item.title, lang) || 'Tarjeta sin título'} as="div" block>
										<article class="card">
											{@render cardImage(item.image, item.imageAlt, pick(item.title, lang))}
											<div class="card-body">
												<h3 title={pick(item.title, lang)}>{@render say(item.title)}</h3>
												<p class="year">{item.start ?? ''}</p>
												<p class="card-text" title={text(item.description)}>
													{#if hasText(item.description)}{@render say(item.description)}{/if}
												</p>
												<div class="card-links">
													{#if item.url}
														<a href={link(item.url)} target="_blank" rel="noopener">
															{ui.more}<span class="visually-hidden"> {pick(item.title, lang)} {ui.newTab}</span>
														</a>
													{/if}
												</div>
											</div>
										</article>
									</Editable>
								</li>
							{/each}
						</ul>
					{/if}
					{#if editor}
						<button type="button" class="add-item" onclick={() => editor.addItem(s.id)}>
							{s.layout === 'list' ? 'Añadir entrada' : 'Añadir tarjeta'}
						</button>
					{/if}
				{/if}
			</div>
		</div>
	</section>
{/snippet}

<div
	class={['site', editing && 'editing']}
	style:color-scheme={scheme}
	lang={lang}
	data-look={editing ? preview.base : undefined}
	data-tpl={editing && preview.template ? preview.id : undefined}
>
	{#if !editing}
		<a class="skip" href="#contenido">{ui.skip}</a>
	{/if}

	<header class="topbar">
		<div class="wrap bar">
			{#if editing}
				<span class="brand">{brandName}</span>
			{:else}
				<a class="brand" href={`${LANG_PATHS[lang]}#inicio`}>{brandName}</a>
			{/if}
			<nav class="nav" aria-label={ui.navLabel} bind:this={navEl}>
				<span
					class={['nav-pill', pill.shown && 'shown', pill.ready && 'ready']}
					style:transform={`translate(${pill.x}px, ${pill.y}px)`}
					style:width={`${pill.w}px`}
					style:height={`${pill.h}px`}
					aria-hidden="true"
				></span>
				{#each shown as id (id)}
					<a href={`#${id}`} data-id={id} aria-current={activeId === id ? 'true' : undefined}>{sectionTitle(id)}</a>
				{/each}
			</nav>
			<div class="tools">
				<ul class="langs" aria-label={ui.langLabel}>
					{#each LANGS as l (l)}
						<li>
							{#if editing}
								<span class={['lang', l === lang && 'current']}>{l.toUpperCase()}</span>
							{:else}
								<a href={LANG_PATHS[l]} hreflang={l} lang={l} aria-current={l === lang ? 'page' : undefined} data-sveltekit-reset="false">
									<span aria-hidden="true">{l.toUpperCase()}</span>
									<span class="visually-hidden">{LANG_NAMES[l]}</span>
								</a>
							{/if}
						</li>
					{/each}
				</ul>
				{#if !editing}
					<LookPicker {content} {lang} />
					<ThemeToggle {lang} />
				{/if}
			</div>
		</div>
	</header>

	<div class="hero" id="inicio">
		<div class="wrap hero-grid">
			<div class="hero-text">
				<Editable target="hero.availability" label="Disponibilidad">
					<span class="status"><span class="status-dot" aria-hidden="true"></span>{@render say(content.hero.availability)}</span>
				</Editable>
				<Editable target="hero.greeting" label="Saludo">
					<span class="greeting">{@render say(content.hero.greeting)}</span>
				</Editable>
				<Editable target="profile" label="Nombre" as="div" block>
					<h1 class="name">
						<span class="name-line">{nameParts.first}</span>
						{#if nameParts.rest}<span class="name-line">{nameParts.rest}</span>{/if}
					</h1>
				</Editable>
				<Editable target="hero.subtitle" label="Subtítulo" as="div" block>
					<p class="hero-lead">{@render say(content.hero.subtitle)}</p>
				</Editable>
				<Editable target="profile" label="Currículum y enlaces" as="div" block>
					<div class="actions">
						<a class="btn primary" href={link(content.profile.cv)} download>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path></svg>
							{ui.cv}
						</a>
						<a class="btn" href={link(content.profile.linkedin)} rel="me noopener" target="_blank">LinkedIn<span class="visually-hidden"> {ui.newTab}</span></a>
						<a class="btn" href={link(content.profile.github)} rel="me noopener" target="_blank">GitHub<span class="visually-hidden"> {ui.newTab}</span></a>
					</div>
				</Editable>
			</div>
			<div class="hero-photo">
				<Editable target="photo" label="Foto de perfil" as="div">
					<div class="photo">
						<div class="photo-inner">
							<img
								src={asset(content.profile.photo)}
								alt={pick(content.profile.photoAlt, lang)}
								width={photoSize.width}
								height={photoSize.height}
								fetchpriority="high"
								style:transform={frameTransform(content.profile.photoFrame)}
							/>
						</div>
					</div>
				</Editable>
			</div>
		</div>
	</div>

	<svelte:element this={editing ? 'div' : 'main'} id="contenido">
		{#each shown as id (id)}
			{#if id === 'sobre'}
				{@render aboutBlock()}
			{:else if id === 'educacion'}
				{@render educationBlock()}
			{:else if id === 'experiencia'}
				{@render experienceBlock()}
			{:else if id === 'proyectos'}
				{@render projectsBlock()}
			{:else}
				{@const section = custom.get(id)}
				{#if section}{@render customBlock(section)}{/if}
			{/if}
		{/each}

		{#if editor}
			<div class="new-section" id="nueva-seccion">
				<div class="wrap">
					<p class="new-section-h">Añadir una sección</p>
					<div class="new-section-opts">
						{#each SECTION_LAYOUTS as layout (layout)}
							<button type="button" onclick={() => editor.addSection(layout)}>
								<strong>{LAYOUT_INFO[layout].label}</strong>
								<span>{LAYOUT_INFO[layout].hint}</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</svelte:element>

	<footer class="foot">
		<div class="wrap foot-grid">
			<p>© 2026 {content.profile.name}. {ui.made}</p>
			<ul class="foot-links">
				<li><a href={link(content.profile.linkedin)} rel="me noopener" target="_blank">LinkedIn<span class="visually-hidden"> {ui.newTab}</span></a></li>
				<li><a href={link(content.profile.github)} rel="me noopener" target="_blank">GitHub<span class="visually-hidden"> {ui.newTab}</span></a></li>
				<li><a href={link(content.profile.cv)} download>{ui.cv}</a></li>
			</ul>
			{#if !editing}
				<ul class="foot-links" aria-label={ui.langLabel}>
					{#each LANGS as l (l)}
						<li><a href={LANG_PATHS[l]} hreflang={l} lang={l} aria-current={l === lang ? 'page' : undefined}>{LANG_NAMES[l]}</a></li>
					{/each}
				</ul>
			{/if}
		</div>
	</footer>
</div>

<style>
	.site {
		/* Los textos ocultos (solo para lectores de pantalla) se posicionan dentro de la web, no de la ventana del editor. */
		position: relative;
		container: site / inline-size;
	}
	.site :where(h1, h2, h3, p, ul, ol, figure) {
		margin: 0;
	}
	/*
	 * Las plantillas propias (templates.ts) cambian tamaños y posiciones con variables: --page-max,
	 * --space, --name-scale, --hero-cols… Sin ellas, cada regla usa su valor de siempre.
	 */
	.wrap {
		width: min(100% - 2.5rem, var(--page-max, 76rem));
		margin-inline: auto;
	}
	@container site (width >= 48rem) {
		.wrap {
			width: min(100% - 5rem, var(--page-max, 76rem));
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
		z-index: 30;
		padding: 0.7rem 1.1rem;
		border-radius: 999px;
		background: var(--ink);
		color: var(--paper);
		font-weight: 600;
		text-decoration: none;
	}
	.skip:focus {
		top: 0.75rem;
	}
	.missing {
		font-style: italic;
		opacity: 0.7;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	/* Barra superior: fija; su fondo aparece al empezar a bajar (con el propio scroll, sin JavaScript). */
	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
	}
	.topbar::before {
		content: '';
		position: absolute;
		inset: 0;
		background: color-mix(in oklch, var(--paper) 84%, transparent);
		-webkit-backdrop-filter: blur(16px) saturate(1.3);
		backdrop-filter: blur(16px) saturate(1.3);
		border-bottom: 1px solid var(--line);
	}
	@supports (animation-timeline: scroll()) {
		.site:not(.editing) .topbar::before {
			animation: bar-solid linear both;
			animation-timeline: scroll(root);
			animation-range: 0 140px;
		}
	}
	@keyframes bar-solid {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.editing .topbar {
		position: relative;
	}
	.bar {
		position: relative;
		display: flex;
		align-items: center;
		gap: 1.25rem;
		min-height: 4.25rem;
	}
	.brand {
		margin-right: auto;
		color: var(--ink);
		font-family: var(--font-display);
		font-stretch: var(--display-stretch);
		font-weight: 650;
		font-size: 1rem;
		letter-spacing: -0.01em;
		text-decoration: none;
		white-space: nowrap;
	}
	.nav {
		position: relative;
		display: none;
		align-items: center;
	}
	@container site (width >= 62rem) {
		.nav {
			display: flex;
		}
	}
	.nav a {
		position: relative;
		z-index: 1;
		padding: 0.4rem 0.85rem;
		border-radius: var(--radius-pill);
		color: var(--muted);
		font-family: var(--font-ui);
		font-size: 0.9375rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		transition: color 0.25s;
	}
	.nav a:hover,
	.nav a[aria-current='true'] {
		color: var(--ink);
	}
	/* La píldora que marca la sección que se está leyendo: se desliza de un enlace a otro. */
	.nav-pill {
		position: absolute;
		left: 0;
		top: 0;
		border-radius: var(--radius-pill);
		background: var(--accent-soft);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.3s;
	}
	.nav-pill.shown {
		opacity: 1;
	}
	.nav-pill.ready {
		transition:
			opacity 0.3s,
			transform 0.5s var(--ease-out),
			width 0.5s var(--ease-out);
	}
	.tools {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.langs {
		list-style: none;
		margin: 0;
		padding: 3px;
		display: flex;
		gap: 2px;
		border: 1px solid var(--line);
		border-radius: var(--radius-pill);
		background: var(--surface);
	}
	.langs a,
	.langs .lang {
		display: block;
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-pill);
		color: var(--muted);
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 650;
		letter-spacing: 0.03em;
		line-height: 1.5;
		text-decoration: none;
		transition:
			color 0.2s,
			background-color 0.2s;
	}
	.langs a:hover {
		color: var(--ink);
	}
	.langs a[aria-current='page'],
	.langs .current {
		background: var(--ink);
		color: var(--paper);
	}

	/* Portada */
	.hero {
		padding-block: calc(clamp(2.5rem, 7cqi, 6rem) * var(--space, 1)) calc(clamp(4rem, 9cqi, 7.5rem) * var(--space, 1));
	}
	.hero-grid {
		display: grid;
		gap: 2.25rem;
	}
	.hero-photo {
		display: var(--photo-display, block);
		order: -1;
		justify-self: var(--photo-justify, normal);
	}
	@container site (width >= 60rem) {
		.hero-grid {
			grid-template-columns: var(--hero-cols, minmax(0, 1fr) auto);
			align-items: var(--hero-valign, end);
			column-gap: 4rem;
		}
		.hero-photo {
			order: var(--photo-order, 0);
		}
	}
	.hero-text {
		display: flex;
		flex-direction: column;
		align-items: var(--hero-items, flex-start);
		text-align: var(--hero-text, start);
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.9rem 0.35rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--muted);
		font-family: var(--font-ui);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
	}
	.status-dot {
		position: relative;
		flex: none;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
	}
	.status-dot::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: var(--accent);
		opacity: 0;
	}
	.greeting {
		display: block;
		margin-top: clamp(1.75rem, 4cqi, 2.75rem);
		color: var(--muted);
		font-size: clamp(1.15rem, 2cqi, 1.4rem);
		font-weight: 450;
		letter-spacing: -0.01em;
	}
	.name {
		margin-top: 0.3rem;
		color: var(--ink);
		font-family: var(--font-display);
		font-stretch: var(--display-stretch);
		font-weight: var(--name-weight);
		font-size: calc(var(--name-size) * var(--name-scale, 1));
		line-height: var(--name-leading);
		letter-spacing: var(--name-tracking);
		text-transform: var(--name-case);
		text-wrap: balance;
	}
	.name-line {
		display: block;
	}
	.hero-lead {
		margin-top: clamp(1.5rem, 3.5cqi, 2.4rem);
		max-width: 32ch;
		color: color-mix(in oklch, var(--ink) 82%, var(--paper));
		font-size: calc(clamp(1.25rem, 2.3cqi, 1.6rem) * var(--lead-scale, 1));
		line-height: 1.4;
		letter-spacing: -0.012em;
		text-wrap: pretty;
	}
	.actions {
		margin-top: clamp(2rem, 4cqi, 2.75rem);
		display: flex;
		flex-wrap: wrap;
		justify-content: var(--hero-items, flex-start);
		gap: 0.75rem;
	}
	.btn {
		min-height: var(--btn-h, 48px);
		padding: 0 var(--btn-px, 1.35rem);
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		border: var(--bw) solid var(--line);
		border-radius: var(--radius-btn);
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow);
		font-family: var(--font-ui);
		font-weight: 600;
		font-size: var(--btn-fs, 0.975rem);
		text-decoration: none;
		transition:
			border-color 0.2s,
			background-color 0.2s,
			transform 0.12s var(--ease-out);
	}
	.btn:hover {
		border-color: color-mix(in oklch, var(--ink) 35%, var(--line));
	}
	.btn:active {
		transform: scale(0.97);
	}
	.btn.primary {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--accent-ink);
	}
	.btn.primary:hover {
		background: color-mix(in oklch, var(--accent) 86%, var(--ink));
	}
	/*
	 * El recuadro de la foto toma su proporción (no se recorta) y el encuadre del editor
	 * la mueve dentro. La capa intermedia permite animar la entrada sin tocar el encuadre.
	 */
	.photo {
		--photo-w: calc(clamp(8.5rem, 20cqi, 17rem) * var(--photo-scale, 1));
		width: var(--photo-w);
		max-width: 100%;
		max-height: calc(var(--photo-w) * 1.75);
		border-radius: var(--radius-photo);
		overflow: hidden;
		background: var(--sunken);
	}
	.photo-inner img {
		display: block;
		width: 100%;
		height: auto;
		filter: var(--photo-filter);
	}

	/* Secciones */
	.block {
		padding-block: calc(clamp(4rem, 9cqi, 7.5rem) * var(--space, 1));
	}
	.block + .block {
		border-top: 1px solid var(--line);
	}
	.block-grid {
		display: grid;
		gap: 2rem 4rem;
	}
	.block h2 {
		color: var(--ink);
		font-family: var(--font-display);
		font-stretch: var(--display-stretch);
		font-weight: var(--h2-weight);
		font-size: calc(var(--h2-size) * var(--h2-scale, 1));
		line-height: 1.04;
		letter-spacing: var(--h2-tracking);
		text-transform: var(--h2-case);
		text-wrap: balance;
		hyphens: auto;
		overflow-wrap: break-word;
	}
	@container site (width >= 60rem) {
		.block-grid {
			grid-template-columns: var(--block-cols, var(--head-w, 17rem) minmax(0, 1fr));
		}
		.block-head {
			position: var(--head-pos, sticky);
			top: 6rem;
			align-self: start;
		}
		.editing .block-head {
			top: 1.5rem;
		}
		/* En la columna, una palabra larga reduce el título lo justo para caber (≈0,58 em por letra). */
		.block-head h2 {
			font-size: min(
				calc(var(--h2-size) * var(--h2-scale, 1)),
				calc(var(--head-fit, var(--head-w, 17rem)) / (var(--chars, 1) * var(--glyph-w)))
			);
		}
	}
	.bio {
		max-width: 40ch;
		font-size: calc(clamp(1.3rem, 2.2cqi, 1.65rem) * var(--text-scale, 1));
		line-height: 1.45;
		letter-spacing: -0.012em;
		text-wrap: pretty;
	}
	.skills-h {
		margin-top: 3rem;
		margin-bottom: 0.5rem;
		color: var(--muted);
		font-size: 0.9375rem;
		font-weight: 600;
	}
	.skills {
		list-style: none;
		padding: 0;
		display: grid;
		column-gap: 2.5rem;
	}
	@container site (width >= 40rem) {
		.skills {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.skills li {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.85rem 0;
		border-top: 1px solid var(--line);
	}
	.skills li::before {
		content: '';
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: 2px;
		background: var(--accent);
		transform: translateY(-0.15em);
	}

	/* Líneas de tiempo: un raíl con un punto por entrada. */
	.rows {
		position: relative;
		list-style: none;
		padding: 0;
	}
	.rows::before {
		content: '';
		position: absolute;
		top: 0.85rem;
		bottom: 0.85rem;
		left: 4px;
		width: 1px;
		background: var(--accent);
		opacity: 0.45;
		transform-origin: top;
	}
	.row {
		position: relative;
		display: grid;
		gap: 0.3rem 3rem;
		padding: 0 0 2.25rem 1.9rem;
	}
	.rows > li:last-child .row {
		padding-bottom: 0;
	}
	.row::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.5rem;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 4px var(--paper);
	}
	@container site (width >= 40rem) {
		.row {
			grid-template-columns: 9rem minmax(0, 1fr);
			padding-left: 0;
		}
		.rows::before {
			left: calc(9rem + 1.5rem - 0.5px);
		}
		.row::before {
			left: calc(9rem + 1.5rem - 4.5px);
		}
	}
	.when {
		color: var(--accent);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.when-small {
		color: var(--muted);
		font-weight: 500;
		font-size: 0.875rem;
	}
	.row h3 {
		font-size: 1.2rem;
		line-height: 1.3;
		font-weight: 620;
		letter-spacing: -0.015em;
		text-wrap: balance;
	}
	.org {
		margin-top: 0.15rem;
		color: var(--muted);
	}
	.desc {
		margin-top: 0.6rem;
		max-width: 62ch;
		text-wrap: pretty;
	}

	/* Tarjetas: todas miden lo mismo; título en una línea y texto en tres, cortados con «…». */
	.cards > li > :global(.editable),
	.cards > li > :global(.editable) > :global(.editable-content) {
		height: 100%;
	}
	.cards {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 1.25rem;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--cards-min, 19rem)), 1fr));
	}
	.card {
		height: 100%;
		display: flex;
		flex-direction: column;
		border: var(--bw) solid var(--line);
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: var(--shadow);
		overflow: hidden;
		transition: border-color 0.3s;
	}
	.card:hover {
		border-color: color-mix(in oklch, var(--ink) 22%, var(--line));
	}
	/* La imagen llena el recuadro (sin bandas); si es transparente, se ve sobre blanco. */
	.card figure {
		aspect-ratio: var(--card-ratio, 16 / 9);
		overflow: hidden;
		background: #fff;
		border-bottom: var(--bw) solid var(--line);
	}
	.card figure img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
		transition: transform 0.9s var(--ease-out);
	}
	.site:not(.editing) .card:hover figure img {
		transform: scale(1.04);
	}
	.card .no-image {
		display: grid;
		place-items: center;
		padding: 1.25rem;
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 650;
		font-size: 2rem;
		line-height: 1.05;
		letter-spacing: -0.03em;
		text-align: center;
		overflow-wrap: anywhere;
	}
	.card .no-image-note {
		color: var(--muted);
		font-weight: 400;
		font-size: 1rem;
		font-style: italic;
		letter-spacing: 0;
	}
	.card-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 1.25rem 1.35rem 1.35rem;
	}
	.card h3 {
		font-family: var(--font-display);
		font-stretch: var(--display-stretch);
		font-size: 1.35rem;
		font-weight: 640;
		line-height: 1.2;
		letter-spacing: -0.025em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.card .year {
		min-height: 1.5em;
		color: var(--muted);
		font-size: 0.875rem;
		line-height: 1.5;
		font-variant-numeric: tabular-nums;
	}
	.card-text {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
		min-height: 3lh;
		color: color-mix(in oklch, var(--ink) 85%, var(--paper));
	}
	.card-links {
		margin-top: auto;
		min-height: 2.6rem;
		padding-top: 0.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.1rem;
	}
	.card a {
		color: var(--accent);
		font-weight: 600;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.25em;
	}
	.card a:hover {
		text-decoration-thickness: 2px;
	}
	/* La página del proyecto es el enlace principal: va como botón; el proyecto externo, como texto. */
	.card a.card-page {
		padding: 0.45rem 1rem;
		border-radius: var(--radius-btn);
		background: var(--accent);
		color: var(--accent-ink);
		text-decoration: none;
		transition:
			background-color 0.2s,
			transform 0.12s var(--ease-out);
	}
	.card a.card-page:hover {
		background: color-mix(in oklch, var(--accent) 86%, var(--ink));
	}
	.card a.card-page:active {
		transform: scale(0.97);
	}

	/* Secciones nuevas */
	.prose {
		display: flex;
		flex-direction: column;
		gap: 1em;
		max-width: 62ch;
		font-size: calc(clamp(1.1rem, 1.6cqi, 1.2rem) * var(--text-scale, 1));
		text-wrap: pretty;
	}
	.prose p,
	.lead {
		white-space: pre-line;
	}
	.lead {
		max-width: 62ch;
		margin-bottom: 2rem;
		color: color-mix(in oklch, var(--ink) 85%, var(--paper));
		font-size: calc(clamp(1.1rem, 1.6cqi, 1.2rem) * var(--text-scale, 1));
		text-wrap: pretty;
	}
	.after-text {
		margin-top: 2.25rem;
	}
	.placeholder {
		color: var(--muted);
		font-style: italic;
	}
	.more {
		display: inline-block;
		margin-top: 0.6rem;
		padding-block: 0.2rem;
		color: var(--accent);
		font-weight: 600;
		text-underline-offset: 0.25em;
	}
	.add-item {
		width: 100%;
		min-height: 48px;
		margin-top: 1.25rem;
		border: 1px dashed color-mix(in oklch, var(--ink) 25%, var(--line));
		border-radius: 14px;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.add-item:hover {
		border-color: oklch(0.8 0.17 85);
		color: var(--ink);
	}
	.new-section {
		border-top: 1px solid var(--line);
		padding-block: 2.5rem 3.5rem;
	}
	.new-section-h {
		margin-bottom: 0.75rem;
		font-weight: 650;
	}
	.new-section-opts {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
	}
	.new-section-opts button {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.1rem;
		border: 1px dashed color-mix(in oklch, var(--ink) 25%, var(--line));
		border-radius: 14px;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-size: 0.95rem;
		line-height: 1.45;
		text-align: left;
		cursor: pointer;
	}
	.new-section-opts strong {
		color: var(--ink);
		font-size: 1.05rem;
	}
	.new-section-opts button:hover {
		border-color: oklch(0.8 0.17 85);
	}

	/* Pie */
	.foot {
		border-top: 1px solid var(--line);
		padding-block: 2.5rem 3rem;
		color: var(--muted);
		font-size: 0.9375rem;
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
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
	}
	/* El subrayado crece desde la izquierda al pasar el ratón. */
	.foot a {
		display: inline-block;
		padding-block: 0.35rem;
		color: var(--ink);
		text-decoration: none;
		background: linear-gradient(currentColor, currentColor) 0 100% / 0% 1px no-repeat;
		transition: background-size 0.35s var(--ease-out);
	}
	.foot a:hover {
		background-size: 100% 1px;
	}
	.foot a[aria-current='page'] {
		font-weight: 650;
	}

	/*
	 * Movimiento. La portada entra una vez, como una sola ola: el nombre «enfoca» engordando de
	 * fino a grueso (lo principal, lo que más recorre), la foto se descubre de abajo arriba y
	 * el resto le sigue con huecos que se acortan. No hay entradas por sección. Las líneas de
	 * tiempo se dibujan con el propio scroll. En el editor y con movimiento reducido, todo está quieto.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.site:not(.editing) .status {
			animation: fade 0.5s ease-out both;
		}
		.site:not(.editing) .status-dot::after {
			animation: ping 1.4s var(--ease-out) 0.9s 1 both;
		}
		.site:not(.editing) .greeting {
			animation: rise 0.6s var(--ease-out) both;
		}
		.site:not(.editing) .name-line {
			animation: focus-in 1.1s var(--ease-out) both;
		}
		.site:not(.editing) .name-line + .name-line {
			animation-delay: 0.11s;
		}
		.site:not(.editing) .photo {
			animation: reveal 1.1s var(--ease-out) 0.2s backwards;
		}
		.site:not(.editing) .photo-inner {
			animation: settle 1.6s var(--ease-out) 0.2s both;
		}
		.site:not(.editing) .hero-lead {
			animation: rise 0.6s var(--ease-out) 0.28s both;
		}
		.site:not(.editing) .actions {
			animation: rise 0.6s var(--ease-out) 0.34s both;
		}
	}
	@supports (animation-timeline: view()) {
		@media (prefers-reduced-motion: no-preference) {
			/* La punta del raíl y el punto que se rellena van juntos, al 70 % de la altura de la ventana. */
			.site:not(.editing) .rows::before {
				animation: rail linear both;
				animation-timeline: view();
				animation-range: entry 30vh entry calc(100% + 30vh);
			}
			.site:not(.editing) .row::before {
				animation: dot linear both;
				animation-timeline: view();
				animation-range: cover 28vh cover 32vh;
			}
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	@keyframes focus-in {
		from {
			opacity: 0;
			font-weight: 200;
			transform: translateY(0.12em);
		}
	}
	@keyframes reveal {
		from {
			clip-path: inset(100% 0 0 0 round var(--radius-photo));
		}
		to {
			clip-path: inset(0 0 0 0 round var(--radius-photo));
		}
	}
	@keyframes settle {
		from {
			transform: scale(1.1);
		}
	}
	@keyframes ping {
		from {
			opacity: 0.55;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(3.2);
		}
	}
	@keyframes rail {
		from {
			transform: scaleY(0);
		}
		to {
			transform: scaleY(1);
		}
	}
	@keyframes dot {
		from {
			background: var(--line);
			transform: scale(0.55);
		}
		to {
			background: var(--accent);
			transform: scale(1);
		}
	}
</style>
