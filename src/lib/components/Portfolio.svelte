<script lang="ts">
	import '@fontsource-variable/bricolage-grotesque/standard.css';
	import '@fontsource-variable/atkinson-hyperlegible-next/index.css';
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

	let {
		content,
		lang,
		scheme
	}: {
		content: SiteContent;
		lang: Lang;
		/** Fuerza tema claro u oscuro (lo usa el editor). Sin valor, sigue al sistema o a la elección del visitante. */
		scheme?: 'light' | 'dark';
	} = $props();

	const editor = useEditor();
	const editing = !!editor;
	const ui = $derived(UI[lang]);

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

</script>

{#snippet say(value: L10n)}
	{#if missing(value)}<span class="missing">{ui.missing}</span>{:else}{text(value)}{/if}
{/snippet}

{#snippet heading(id: string)}
	<div class="block-head">
		<Editable target={`section:${id}`} label={`Sección ${sectionTitle(id)}`} as="div" block>
			<h2 id={`${id}-h`} style:--chars={isBuiltin(id) ? undefined : longestWord(sectionTitle(id))}>
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
									{#if item.image}
										<figure>
											<img src={asset(item.image)} alt={pick(item.imageAlt, lang)} loading="lazy" />
										</figure>
									{:else if editing}
										<figure class="no-image">Sin imagen</figure>
									{/if}
									<div class="card-body">
										<h3>{item.title || (editing ? 'Proyecto sin nombre' : '')}</h3>
										{#if item.year}<p class="year">{item.year}</p>{/if}
										<p>{@render say(item.description)}</p>
										{#if (item.page && isValidSlug(item.page.slug)) || item.url}
											<div class="card-links">
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
											</div>
										{/if}
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
											{#if item.image}
												<figure>
													<img src={asset(item.image)} alt={pick(item.imageAlt, lang)} loading="lazy" />
												</figure>
											{:else if editing}
												<figure class="no-image">Sin imagen</figure>
											{/if}
											<div class="card-body">
												<h3>{@render say(item.title)}</h3>
												{#if item.start}<p class="year">{item.start}</p>{/if}
												{#if hasText(item.description)}<p>{@render say(item.description)}</p>{/if}
												{#if item.url}
													<a href={link(item.url)} target="_blank" rel="noopener">
														{ui.more}<span class="visually-hidden"> {pick(item.title, lang)} {ui.newTab}</span>
													</a>
												{/if}
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

<div class={['site', editing && 'editing']} style:color-scheme={scheme} lang={lang}>
	{#if !editing}
		<a class="skip" href="#contenido">{ui.skip}</a>
	{/if}

	<header class="hero" id="inicio">
		<div class="wrap">
			<div class="bar">
				<span class="brand">Albert Reynés</span>
				<nav class="nav" aria-label={ui.navLabel}>
					{#each shown as id (id)}
						<a href={`#${id}`}>{sectionTitle(id)}</a>
					{/each}
				</nav>
				{#if !editing}
					<ThemeToggle {lang} />
				{/if}
			</div>

			<div class="hero-main">
				<div>
					<div class="intro">
						<Editable target="hero.availability" label="Disponibilidad">
							<span class="availability">{@render say(content.hero.availability)}</span>
						</Editable>
						<Editable target="hero.greeting" label="Saludo">
							<span class="greeting">{@render say(content.hero.greeting)}</span>
						</Editable>
					</div>

					<Editable target="profile" label="Nombre" as="div" block>
						<h1 class="name">
							<span>{nameParts.first}</span>
							{#if nameParts.rest}<span>{nameParts.rest}</span>{/if}
						</h1>
					</Editable>
				</div>
				<Editable target="photo" label="Foto de perfil" as="div">
					<div class="photo">
						<img
							src={asset(content.profile.photo)}
							alt={pick(content.profile.photoAlt, lang)}
							width={photoSize.width}
							height={photoSize.height}
							fetchpriority="high"
							style:transform={frameTransform(content.profile.photoFrame)}
						/>
					</div>
				</Editable>
			</div>

			<div class="hero-foot">
				<Editable target="hero.subtitle" label="Subtítulo en los tres idiomas" as="div" block>
					<nav aria-label={ui.langLabel}>
						<ul class="langs">
							{#each LANGS as l (l)}
								<li>
									<a
										href={LANG_PATHS[l]}
										hreflang={l}
										lang={l}
										aria-current={l === lang ? 'page' : undefined}
										data-sveltekit-reset="false"
									>
										<span class="code" aria-hidden="true">{l.toUpperCase()}</span>
										<span class="sub">
											{#if editing && !content.hero.subtitle[l]?.trim()}
												<span class="missing">{UI[l].missing}</span>
											{:else}
												{editing ? content.hero.subtitle[l] : pick(content.hero.subtitle, l)}
											{/if}
										</span>
										<span class="visually-hidden">({LANG_NAMES[l]})</span>
									</a>
								</li>
							{/each}
						</ul>
					</nav>
				</Editable>
			</div>

			<Editable target="profile" label="Currículum y enlaces" as="div" block>
				<div class="actions">
					<a class="btn primary" href={link(content.profile.cv)} download>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path></svg>
						{ui.cv}
					</a>
					<a class="btn" href={link(content.profile.linkedin)} rel="me noopener" target="_blank">LinkedIn<span class="visually-hidden"> {ui.newTab}</span></a>
					<a class="btn" href={link(content.profile.github)} rel="me noopener" target="_blank">GitHub<span class="visually-hidden"> {ui.newTab}</span></a>
				</div>
			</Editable>
		</div>
	</header>

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

	/* Portada */
	.hero {
		background: var(--hero);
		color: var(--hero-ink);
		padding-block: 1rem clamp(3rem, 7cqi, 5rem);
	}
	.hero :focus-visible {
		outline: 3px solid var(--hero-ink);
		outline-offset: 3px;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem 2rem;
		min-height: 3rem;
	}
	.brand {
		font-family: var(--display);
		font-weight: 700;
		font-stretch: 75%;
		font-size: 1.3rem;
		letter-spacing: 0.01em;
		margin-right: auto;
	}
	.nav {
		display: none;
	}
	@container site (width >= 48rem) {
		.nav {
			display: flex;
			flex-wrap: wrap;
			justify-content: flex-end;
			gap: 0 1.75rem;
		}
	}
	.nav a {
		color: var(--hero-ink);
		text-decoration: none;
		font-weight: 700;
		font-size: 0.95rem;
		padding-block: 0.5rem;
	}
	.nav a:hover {
		text-decoration: underline;
		text-underline-offset: 0.35em;
	}
	.hero-main {
		margin-top: clamp(2.5rem, 8cqi, 6rem);
		display: grid;
		gap: 2rem;
	}
	@container site (width >= 60rem) {
		.hero-main {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: end;
			gap: 3rem;
		}
	}
	.intro {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
	}
	.availability {
		font-size: 0.95rem;
		color: var(--hero-soft);
	}
	.greeting {
		font-size: clamp(1.25rem, 2.4cqi, 1.75rem);
		font-weight: 700;
	}
	.name {
		margin-top: 0.35rem;
		font-family: var(--display);
		font-weight: 800;
		font-stretch: 75%;
		text-transform: uppercase;
		font-size: clamp(3.2rem, 16cqi, 15rem);
		line-height: 0.88;
		letter-spacing: -0.005em;
	}
	.name > span {
		display: block;
	}

	.hero-foot {
		margin-top: clamp(2rem, 5cqi, 3.25rem);
	}
	.langs {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		max-width: 44rem;
	}
	.langs a {
		display: grid;
		grid-template-columns: 2.6rem minmax(0, 1fr);
		gap: 0.85rem;
		align-items: baseline;
		padding: 0.45rem 0.5rem 0.45rem 0;
		color: var(--hero-soft);
		text-decoration: none;
		font-size: clamp(1.05rem, 1.8cqi, 1.3rem);
		line-height: 1.35;
		border-radius: 8px;
	}
	.langs a:hover {
		color: var(--hero-ink);
	}
	.langs a:hover .sub {
		text-decoration: underline;
		text-underline-offset: 0.3em;
		text-decoration-thickness: 1px;
	}
	.langs a[aria-current='page'] {
		color: var(--hero-ink);
		font-weight: 700;
	}
	.code {
		font-family: var(--display);
		font-weight: 700;
		font-stretch: 75%;
		font-size: 0.95rem;
		letter-spacing: 0.06em;
		text-align: center;
		border: 1.5px solid currentColor;
		border-radius: 6px;
		padding-block: 0.1rem;
		translate: 0 -0.1em;
	}
	.langs a[aria-current='page'] .code {
		background: var(--hero-ink);
		border-color: var(--hero-ink);
		color: var(--hero);
	}
	/*
	 * El recuadro tiene el ancho fijo y toma la proporción de la foto, así no se recorta.
	 * El encuadre del editor mueve y escala la imagen dentro de él. Solo una foto
	 * extremadamente alargada (más de 4:7) se recorta por abajo.
	 */
	.photo {
		--photo-w: clamp(8rem, 17cqi, 15rem);
		width: var(--photo-w);
		max-height: calc(var(--photo-w) * 1.75);
		border-radius: 14px;
		overflow: hidden;
		background: color-mix(in oklch, var(--hero-ink) 15%, var(--hero));
	}
	.photo img {
		display: block;
		width: 100%;
		height: auto;
	}
	.actions {
		margin-top: 2.25rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.btn {
		min-height: 48px;
		padding: 0 1.25rem;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 10px;
		border: 1.5px solid var(--hero-ink);
		color: var(--hero-ink);
		font-weight: 700;
		text-decoration: none;
	}
	.btn:hover {
		background: color-mix(in oklch, var(--hero-ink) 14%, transparent);
	}
	.btn.primary {
		background: var(--hero-ink);
		color: var(--hero);
	}
	.btn.primary:hover {
		background: color-mix(in oklch, var(--hero-ink) 86%, var(--hero));
	}

	/* Secciones */
	.block {
		padding-block: clamp(3.5rem, 8cqi, 6.5rem);
	}
	.block + .block {
		border-top: 1px solid var(--line);
	}
	.block :focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}
	.block-grid {
		display: grid;
		gap: 1.75rem 3rem;
	}
	@container site (width >= 60rem) {
		.block-grid {
			grid-template-columns: 16rem minmax(0, 1fr);
		}
		.block-head {
			position: sticky;
			top: 1.5rem;
			align-self: start;
		}
	}
	.block h2 {
		font-family: var(--display);
		font-weight: 800;
		font-stretch: 75%;
		font-size: clamp(2.25rem, 5.5cqi, 3.75rem);
		line-height: 0.95;
		letter-spacing: -0.005em;
		text-wrap: balance;
		/* Los títulos de las secciones nuevas pueden ser palabras largas: se parten en vez de invadir el contenido. */
		hyphens: auto;
		overflow-wrap: break-word;
	}
	@container site (width >= 60rem) {
		/* En la columna estrecha, una palabra larga reduce el título lo justo para caber (≈0,4 em por letra). */
		.block-head h2 {
			font-size: min(clamp(2.25rem, 5.5cqi, 3.75rem), calc(16rem / (var(--chars, 1) * 0.4)));
		}
	}
	.bio {
		font-size: clamp(1.2rem, 2.1cqi, 1.5rem);
		line-height: 1.5;
		max-width: 46ch;
		text-wrap: pretty;
	}
	.skills-h {
		margin-top: 2.75rem;
		margin-bottom: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		color: var(--muted);
	}
	.skills {
		list-style: none;
		padding: 0;
		display: grid;
		column-gap: 2rem;
	}
	@container site (width >= 40rem) {
		.skills {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.skills li {
		padding: 0.8rem 0;
		border-top: 1px solid var(--line);
	}

	.rows {
		list-style: none;
		padding: 0;
	}
	.rows > li + li {
		border-top: 1px solid var(--line);
	}
	.row {
		display: grid;
		gap: 0.35rem 2rem;
		padding-block: 1.5rem;
	}
	.rows > li:first-child .row {
		padding-top: 0.25rem;
	}
	@container site (width >= 40rem) {
		.row {
			grid-template-columns: 11rem minmax(0, 1fr);
		}
	}
	.when {
		font-family: var(--display);
		font-weight: 700;
		font-stretch: 75%;
		font-size: 1.5rem;
		line-height: 1.15;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.when-small {
		font-family: var(--body);
		font-stretch: 100%;
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--muted);
		line-height: 1.6;
	}
	.row h3 {
		font-size: 1.25rem;
		line-height: 1.3;
		font-weight: 700;
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

	.cards {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 1.5rem;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
	}
	.card {
		height: 100%;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: var(--surface);
		overflow: hidden;
	}
	.card figure {
		aspect-ratio: 16 / 9;
		background: var(--sunken);
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}
	.card figure img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}
	.card .no-image {
		color: var(--muted);
		font-style: italic;
	}
	.card-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.25rem 1.25rem 1.4rem;
	}
	.card h3 {
		font-family: var(--display);
		font-weight: 800;
		font-stretch: 75%;
		font-size: 1.85rem;
		line-height: 1;
	}
	.card .year {
		color: var(--muted);
		font-size: 0.95rem;
	}
	.card a {
		align-self: flex-start;
		padding-block: 0.4rem;
		color: var(--accent);
		font-weight: 700;
		text-underline-offset: 0.25em;
	}
	/* Las secciones nuevas en tarjetas ponen el enlace suelto al final. */
	.card-body > a {
		margin-top: auto;
	}
	.card-links {
		margin-top: auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.25rem;
	}
	/* La página del proyecto es el enlace principal: va como botón; el proyecto externo, como texto. */
	.card a.card-page {
		padding: 0.4rem 0.95rem;
		border: 1.5px solid currentColor;
		border-radius: 999px;
		text-decoration: none;
	}
	.card a.card-page:hover {
		background: color-mix(in oklch, var(--accent) 12%, transparent);
	}

	/* Secciones nuevas */
	.prose {
		display: flex;
		flex-direction: column;
		gap: 1em;
		max-width: 62ch;
		font-size: clamp(1.1rem, 1.7cqi, 1.25rem);
		text-wrap: pretty;
	}
	.prose p,
	.lead {
		white-space: pre-line;
	}
	.lead {
		max-width: 62ch;
		margin-bottom: 1.75rem;
		font-size: clamp(1.1rem, 1.7cqi, 1.25rem);
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
		font-weight: 700;
		text-underline-offset: 0.25em;
	}

	.add-item {
		width: 100%;
		min-height: 48px;
		margin-top: 1rem;
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

	.new-section {
		border-top: 1px solid var(--line);
		padding-block: 2.5rem 3.5rem;
	}
	.new-section-h {
		margin-bottom: 0.75rem;
		font-weight: 700;
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
		border: 2px dashed var(--line);
		border-radius: 12px;
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
	.new-section-opts button:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}

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

	@media (prefers-reduced-motion: no-preference) {
		.site:not(.editing) .name > span {
			animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
		}
		.site:not(.editing) .name > span + span {
			animation-delay: 0.09s;
		}
		.site:not(.editing) .photo,
		.site:not(.editing) .hero-foot,
		.site:not(.editing) .actions {
			animation: fade 0.6s 0.35s both;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(0.3em);
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
