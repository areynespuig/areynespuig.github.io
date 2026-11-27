<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { LANG_PATHS, langFromPath, pick } from '../i18n';
	import { projectPath } from '../content/project-pages';
	import { folderName, siteTree, type SiteNode } from '../content/site-map';
	import { safeHref } from '../content/urls';
	import { LANGS, type Lang, type SiteContent } from '../content/types';

	/**
	 * Terminal de la web: un icono abre una ventana tipo Linux, que no bloquea la página, para moverse
	 * por la web con órdenes (ls, cd, tree…). Las carpetas salen del contenido (site-map.ts).
	 */
	let { content }: { content: SiteContent } = $props();

	type Part = { text: string; cls?: 'u' | 'p' | 'd' | 'err' | 'm' };
	type Line = { id: number; parts: Part[] };

	const TEXT = {
		es: {
			open: 'Abrir el terminal',
			close: 'Cerrar el terminal',
			input: 'Escribe una orden',
			welcome: (name: string) => [
				`Bienvenido/a al portafolio de ${name}.`,
				'Esta web también se recorre como un sistema de archivos: cada sección es una carpeta y cada proyecto con página, una subcarpeta. Puedes seguir usando la página con el terminal abierto.',
				'Para más información, /help'
			],
			helpTitle: 'Órdenes disponibles:',
			help: [
				['ls [ruta]', 'lista lo que hay en una carpeta'],
				['cd <ruta>', 'va a una sección o a la página de un proyecto'],
				['tree', 'muestra todo lo que se puede visitar'],
				['pwd', 'dice en qué carpeta estás'],
				['open <proyecto>', 'abre el enlace de un proyecto en otra pestaña'],
				['whoami', 'quién soy'],
				['lang <es|ca|en>', 'cambia el idioma de la web'],
				['clear', 'limpia la pantalla'],
				['exit', 'cierra el terminal']
			],
			examples: 'Ejemplos:',
			keys: 'Tab completa los nombres y las flechas ↑ ↓ recuperan las órdenes anteriores.',
			unknown: (c: string) => `${c}: orden no encontrada. Escribe /help para ver las órdenes.`,
			noSuch: (c: string, p: string) => `${c}: ${p}: No existe el archivo o el directorio`,
			notDir: (c: string, p: string) => `${c}: ${p}: No es un directorio`,
			noPage: (n: string) => `${n} no tiene página propia. Para abrir su enlace: open ${n}`,
			noLink: (n: string) => `open: ${n}: no tiene enlace`,
			opening: (n: string) => `Abriendo ${n} en otra pestaña…`,
			openUsage: 'open: falta el nombre de un proyecto',
			empty: '(carpeta vacía)',
			langUsage: 'lang: idiomas disponibles: es, ca, en',
			tooMany: (c: string) => `${c}: demasiados argumentos`,
			sudo: (u: string) => `${u} no está en el archivo sudoers. Este incidente será reportado.`
		},
		ca: {
			open: 'Obrir el terminal',
			close: 'Tancar el terminal',
			input: 'Escriu una ordre',
			welcome: (name: string) => [
				`Benvingut/da al portafoli ${/^[aeiouhàèéíïòóúü]/i.test(name) ? "d'" : 'de '}${name}.`,
				'Aquest web també es recorre com un sistema de fitxers: cada secció és una carpeta i cada projecte amb pàgina, una subcarpeta. Pots continuar fent servir la pàgina amb el terminal obert.',
				'Per a més informació, /help'
			],
			helpTitle: 'Ordres disponibles:',
			help: [
				['ls [ruta]', 'llista el que hi ha en una carpeta'],
				['cd <ruta>', "va a una secció o a la pàgina d'un projecte"],
				['tree', 'mostra tot el que es pot visitar'],
				['pwd', 'diu en quina carpeta ets'],
				['open <projecte>', "obre l'enllaç d'un projecte en una altra pestanya"],
				['whoami', 'qui sóc'],
				['lang <es|ca|en>', "canvia l'idioma del web"],
				['clear', 'neteja la pantalla'],
				['exit', 'tanca el terminal']
			],
			examples: 'Exemples:',
			keys: 'El tabulador completa els noms i les fletxes ↑ ↓ recuperen les ordres anteriors.',
			unknown: (c: string) => `${c}: no s'ha trobat l'ordre. Escriu /help per veure les ordres.`,
			noSuch: (c: string, p: string) => `${c}: ${p}: No existeix el fitxer o el directori`,
			notDir: (c: string, p: string) => `${c}: ${p}: No és un directori`,
			noPage: (n: string) => `${n} no té pàgina pròpia. Per obrir-ne l'enllaç: open ${n}`,
			noLink: (n: string) => `open: ${n}: no té enllaç`,
			opening: (n: string) => `S'està obrint ${n} en una altra pestanya…`,
			openUsage: "open: falta el nom d'un projecte",
			empty: '(carpeta buida)',
			langUsage: 'lang: idiomes disponibles: es, ca, en',
			tooMany: (c: string) => `${c}: massa arguments`,
			sudo: (u: string) => `${u} no és al fitxer sudoers. Es notificarà aquest incident.`
		},
		en: {
			open: 'Open the terminal',
			close: 'Close the terminal',
			input: 'Type a command',
			welcome: (name: string) => [
				`Welcome to ${name}'s portfolio.`,
				'This site can also be browsed like a file system: each section is a folder and each project with a page, a subfolder. You can keep using the page with the terminal open.',
				'For more information, /help'
			],
			helpTitle: 'Available commands:',
			help: [
				['ls [path]', 'lists what is in a folder'],
				['cd <path>', "goes to a section or to a project's page"],
				['tree', 'shows everything you can visit'],
				['pwd', 'tells you which folder you are in'],
				['open <project>', "opens a project's link in a new tab"],
				['whoami', 'who I am'],
				['lang <es|ca|en>', "changes the site's language"],
				['clear', 'clears the screen'],
				['exit', 'closes the terminal']
			],
			examples: 'Examples:',
			keys: 'Tab completes names and the ↑ ↓ arrows bring back earlier commands.',
			unknown: (c: string) => `${c}: command not found. Type /help to see the commands.`,
			noSuch: (c: string, p: string) => `${c}: ${p}: No such file or directory`,
			notDir: (c: string, p: string) => `${c}: ${p}: Not a directory`,
			noPage: (n: string) => `${n} has no page of its own. To open its link: open ${n}`,
			noLink: (n: string) => `open: ${n}: has no link`,
			opening: (n: string) => `Opening ${n} in a new tab…`,
			openUsage: 'open: missing a project name',
			empty: '(empty folder)',
			langUsage: 'lang: available languages: es, ca, en',
			tooMany: (c: string) => `${c}: too many arguments`,
			sudo: (u: string) => `${u} is not in the sudoers file. This incident will be reported.`
		}
	} satisfies Record<Lang, unknown>;

	const COMMANDS = ['help', 'ls', 'cd', 'tree', 'pwd', 'open', 'whoami', 'lang', 'clear', 'exit'];
	const HOST = 'portfolio';

	const lang = $derived(langFromPath(page.url.pathname));
	const t = $derived(TEXT[lang]);
	const tree = $derived(siteTree(content, lang));
	const user = $derived(folderName(content.profile.name.trim().split(/\s+/)[0] ?? '') || 'guest');

	// Carpeta actual, guardada por claves que no dependen del idioma (id de la sección y nombre del proyecto).
	let cwdKeys = $state<string[]>([]);
	const keyOf = (node: SiteNode) => (node.kind === 'section' ? node.anchor! : node.name);
	const cwd = $derived(walkKeys(cwdKeys));
	const promptPath = $derived(cwd.length ? `~/${cwd.map((n) => n.name).join('/')}` : '~');

	let open = $state(false);
	let mounted = $state(false);
	let lines = $state<Line[]>([]);
	let input = $state('');
	let history: string[] = [];
	let historyAt = 0;
	let seq = 0;

	let button = $state<HTMLButtonElement>();
	let panel = $state<HTMLElement>();
	let screen = $state<HTMLElement>();
	let field = $state<HTMLInputElement>();

	function walkKeys(keys: string[]): SiteNode[] {
		const out: SiteNode[] = [];
		let list = tree;
		for (const key of keys) {
			const node = list.find((n) => keyOf(n) === key);
			if (!node) break;
			out.push(node);
			list = node.children;
		}
		return out;
	}

	const isDir = (node: SiteNode) => node.kind === 'section' || !!node.slug;
	const projectsNode = () => tree.find((n) => n.anchor === 'proyectos');
	const onHome = () => page.url.pathname === LANG_PATHS[lang];
	/** El proyecto cuya página se está viendo, si es el caso. */
	const currentProject = () => projectsNode()?.children.find((p) => p.slug && projectPath(lang, p.slug) === page.url.pathname);

	// En la página de un proyecto, el terminal está en su carpeta; al volver a la portada, en «proyectos».
	$effect(() => {
		void page.url.pathname;
		const project = currentProject();
		const projects = projectsNode();
		if (project && projects) cwdKeys = [keyOf(projects), keyOf(project)];
		else if (untrack(() => cwdKeys.length > 1)) cwdKeys = cwdKeys.slice(0, 1);
	});

	// Salida

	function print(...rows: (string | Part[])[]) {
		for (const row of rows) lines.push({ id: ++seq, parts: typeof row === 'string' ? [{ text: row }] : row });
	}
	const fail = (text: string) => print([{ text, cls: 'err' }]);
	const echo = (raw: string) =>
		print([{ text: `${user}@${HOST}`, cls: 'u' }, { text: ':' }, { text: promptPath, cls: 'p' }, { text: `$ ${raw}` }]);

	async function scrollEnd() {
		await tick();
		screen?.scrollTo({ top: screen.scrollHeight });
	}

	// Rutas: absolutas (/proyectos/x), relativas (proyectos, ../x), ~ y .. ; sin distinguir mayúsculas ni acentos.

	type Resolved = { nodes: SiteNode[] } | { error: 'noSuch' | 'notDir' };

	function resolve(arg: string): Resolved {
		let rest = arg.trim();
		let nodes: SiteNode[];
		if (rest === '' || rest === '~' || rest === '/') return { nodes: [] };
		if (rest.startsWith('~/')) [nodes, rest] = [[], rest.slice(2)];
		else if (rest.startsWith('/')) [nodes, rest] = [[], rest.slice(1)];
		else nodes = [...cwd];
		for (const segment of rest.split('/').filter(Boolean)) {
			if (segment === '.') continue;
			if (segment === '..' || segment === '-') {
				nodes.pop();
				continue;
			}
			const parent = nodes.at(-1);
			if (parent && !isDir(parent)) return { error: 'notDir' };
			const key = folderName(segment);
			const next = (parent ? parent.children : tree).find((n) => n.name === key || n.aliases.includes(key));
			if (!next) return { error: 'noSuch' };
			nodes.push(next);
		}
		return { nodes };
	}

	/**
	 * Va a otra página sin quitarle el foco al terminal (se puede seguir escribiendo). Como así
	 * SvelteKit tampoco mueve el scroll, se lleva a la sección pedida o al principio de la página.
	 */
	async function visit(url: string) {
		await goto(url, { reset: false });
		const hash = new URL(url, location.href).hash.slice(1);
		const target = hash ? document.getElementById(hash) : null;
		if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
		else scrollTo({ top: 0, behavior: 'instant' });
	}

	// Órdenes

	function list(arg = '.') {
		const found = resolve(arg);
		if ('error' in found) return fail(t.noSuch('ls', arg));
		const target = found.nodes.at(-1);
		if (target && !isDir(target)) return print(target.name);
		const items = target ? target.children : tree;
		if (!items.length) return print([{ text: t.empty, cls: 'm' }]);
		print(
			items.flatMap((n, i) => [
				...(i ? [{ text: '  ' }] : []),
				isDir(n) ? { text: `${n.name}/`, cls: 'd' as const } : { text: n.name }
			])
		);
	}

	function showTree() {
		print([{ text: '~', cls: 'p' }]);
		const draw = (items: SiteNode[], indent: string) => {
			items.forEach((n, i) => {
				const last = i === items.length - 1;
				print([{ text: `${indent}${last ? '└── ' : '├── '}` }, isDir(n) ? { text: `${n.name}/`, cls: 'd' } : { text: n.name }]);
				draw(n.children, indent + (last ? '    ' : '│   '));
			});
		};
		draw(tree, '');
	}

	function help() {
		print(t.helpTitle);
		// En una ventana estrecha (el móvil), cada explicación va debajo de su orden; si no, en columna.
		const narrow = (screen?.clientWidth ?? 600) < 520;
		const width = Math.max(...t.help.map(([c]) => c.length)) + 3;
		for (const [cmd, text] of t.help) {
			if (narrow) print([{ text: `  ${cmd}`, cls: 'd' }], [{ text: `      ${text}` }]);
			else print([{ text: `  ${cmd.padEnd(width)}`, cls: 'd' }, { text }]);
		}
		const first = tree[0];
		const projects = projectsNode();
		const withPage = projects?.children.find((p) => p.slug);
		const samples = [
			first && `cd /${first.name}`,
			projects && withPage && `cd /${projects.name}/${withPage.name}`,
			'cd ..',
			'ls'
		].filter(Boolean);
		print('', `${t.examples} ${samples.join('   ')}`, [{ text: t.keys, cls: 'm' }]);
	}

	async function change(arg = '~') {
		const found = resolve(arg);
		if ('error' in found) return fail((found.error === 'noSuch' ? t.noSuch : t.notDir)('cd', arg));
		const nodes = found.nodes;
		const target = nodes.at(-1);
		if (target && !isDir(target)) return fail(t.noPage(target.name));
		cwdKeys = nodes.map(keyOf);
		const home = LANG_PATHS[lang];
		if (!target) {
			if (onHome()) {
				scrollTo({ top: 0 });
				replaceState(home, page.state);
			} else await visit(home);
		} else if (target.kind === 'section') {
			if (onHome()) {
				document.getElementById(target.anchor!)?.scrollIntoView({ block: 'start' });
				replaceState(`${home}#${target.anchor}`, page.state);
			} else await visit(`${home}#${target.anchor}`);
		} else if (target.slug) {
			await visit(projectPath(lang, target.slug));
		}
	}

	function openLink(arg?: string) {
		if (!arg) return fail(t.openUsage);
		const found = resolve(arg);
		const target = 'nodes' in found ? found.nodes.at(-1) : undefined;
		if (!target) return fail(t.noSuch('open', arg));
		const href = target.url ? safeHref(target.url) : undefined;
		if (!href) return fail(t.noLink(target.name));
		print(t.opening(target.name));
		window.open(href, '_blank', 'noopener');
	}

	function switchLang(arg?: string) {
		const next = LANGS.find((l) => l === arg?.toLowerCase());
		if (!next) return fail(t.langUsage);
		const project = currentProject();
		void visit(project?.slug ? projectPath(next, project.slug) : `${LANG_PATHS[next]}${location.hash}`);
	}

	async function run(raw: string) {
		echo(raw);
		const [word = '', ...args] = raw.trim().split(/\s+/);
		const cmd = word.replace(/^\//, '').toLowerCase();
		if (!cmd) return;
		history.push(raw);
		historyAt = history.length;
		switch (cmd) {
			case 'help':
			case 'ayuda':
			case 'ajuda':
				help();
				break;
			case 'ls':
			case 'dir':
				list(args.find((a) => !a.startsWith('-')));
				break;
			case 'tree':
				showTree();
				break;
			case 'cd':
				if (args.length > 1) fail(t.tooMany('cd'));
				else await change(args[0]);
				break;
			case 'pwd':
				print(`/${cwd.map((n) => n.name).join('/')}`);
				break;
			case 'open':
				openLink(args[0]);
				break;
			case 'whoami':
				print(user, [{ text: `${content.profile.name}: ${pick(content.hero.subtitle, lang)}`, cls: 'm' }]);
				break;
			case 'lang':
				switchLang(args[0]);
				break;
			case 'clear':
			case 'cls':
				lines = [];
				break;
			case 'exit':
				close();
				break;
			case 'sudo':
				fail(t.sudo(user));
				break;
			default:
				fail(t.unknown(word));
		}
	}

	// Teclado: Intro ejecuta, Tab completa, ↑ ↓ recorren el historial, Ctrl+L limpia y Ctrl+C cancela.

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const raw = input;
		input = '';
		void run(raw).then(scrollEnd);
	}

	function complete() {
		const words = input.split(' ');
		if (words.length === 1) {
			const typed = words[0].replace(/^\//, '').toLowerCase();
			const found = COMMANDS.filter((c) => c.startsWith(typed));
			if (found.length === 1) input = `${words[0].startsWith('/') ? '/' : ''}${found[0]} `;
			else if (found.length > 1) {
				echo(input);
				print(found.join('  '));
			}
			return;
		}
		const cmd = words[0].replace(/^\//, '').toLowerCase();
		const arg = words.at(-1)!;
		const cut = arg.lastIndexOf('/') + 1;
		const dir = arg.slice(0, cut);
		const partial = folderName(arg.slice(cut));
		const base = dir ? resolve(dir) : { nodes: [...cwd] };
		if ('error' in base) return;
		const parent = base.nodes.at(-1);
		let found = (parent ? parent.children : tree).filter((n) => n.name.startsWith(partial));
		if (cmd === 'cd') found = found.filter(isDir);
		if (cmd === 'open') found = found.filter((n) => n.kind === 'project');
		if (!found.length) return;
		const lead = words.slice(0, -1).join(' ');
		if (found.length === 1) {
			input = `${lead} ${dir}${found[0].name}${isDir(found[0]) && found[0].children.length ? '/' : ''}`;
			return;
		}
		// Varias opciones: se completa lo que tienen en común y se enseñan, como en bash.
		let common = found[0].name;
		for (const n of found) while (!n.name.startsWith(common)) common = common.slice(0, -1);
		if (common.length > partial.length) input = `${lead} ${dir}${common}`;
		else {
			echo(input);
			print(found.flatMap((n, i) => [...(i ? [{ text: '  ' }] : []), isDir(n) ? { text: `${n.name}/`, cls: 'd' as const } : { text: n.name }]));
			void scrollEnd();
		}
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Tab') {
			event.preventDefault();
			complete();
		} else if (event.key === 'ArrowUp' && history.length) {
			event.preventDefault();
			historyAt = Math.max(0, historyAt - 1);
			input = history[historyAt];
		} else if (event.key === 'ArrowDown' && history.length) {
			event.preventDefault();
			historyAt = Math.min(history.length, historyAt + 1);
			input = history[historyAt] ?? '';
		} else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
			event.preventDefault();
			lines = [];
		} else if (event.ctrlKey && event.key.toLowerCase() === 'c' && !getSelection()?.toString()) {
			event.preventDefault();
			echo(`${input}^C`);
			input = '';
			void scrollEnd();
		}
	}

	// Abrir y cerrar: la ventana no bloquea la página; Escape la cierra y el foco vuelve al icono.

	async function show() {
		mounted = true;
		open = true;
		if (!lines.length && !history.length) print(...t.welcome(content.profile.name.trim()), '');
		await tick();
		field?.focus({ preventScroll: true });
		void scrollEnd();
	}

	function close() {
		const inside = panel?.contains(document.activeElement);
		open = false;
		if (inside) button?.focus();
	}

	function onWindowKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && open && panel?.contains(document.activeElement)) {
			event.preventDefault();
			close();
		}
	}

	function focusInput() {
		// Sin robar el foco si se está seleccionando texto para copiarlo.
		if (!getSelection()?.toString()) field?.focus({ preventScroll: true });
	}
</script>

<svelte:window onkeydown={onWindowKey} />

<button
	bind:this={button}
	type="button"
	class={['term-btn', open && 'is-open']}
	aria-label={open ? t.close : t.open}
	title={open ? t.close : t.open}
	aria-expanded={open}
	aria-controls={mounted ? 'site-terminal' : undefined}
	onclick={() => (open ? close() : show())}
>
	<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="m5 7 5 5-5 5"></path>
		<path d="M12 18h7"></path>
	</svg>
</button>

{#if mounted}
	<div
		bind:this={panel}
		id="site-terminal"
		class={['term', open && 'is-open']}
		role="dialog"
		aria-modal="false"
		aria-labelledby="term-title"
		inert={!open}
	>
		<div class="bar">
			<p id="term-title" class="title">{user}@{HOST}: {promptPath}</p>
			<button type="button" class="x" aria-label={t.close} title={t.close} onclick={close}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
			</button>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="screen" bind:this={screen} onclick={focusInput}>
			<div role="log" aria-live="polite">
				{#each lines as line (line.id)}
					<p class="ln">{#each line.parts as part, i (i)}<span class={part.cls}>{part.text}</span>{/each}</p>
				{/each}
			</div>
			<form class="row" onsubmit={submit}>
				<span class="prompt" aria-hidden="true"><span class="u">{user}@{HOST}</span>:<span class="p">{promptPath}</span>$</span>
				<input
					bind:this={field}
					bind:value={input}
					onkeydown={onKey}
					aria-label={t.input}
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					enterkeyhint="send"
				/>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Aspecto de terminal de Linux (paleta Tango, como GNOME Terminal), igual con cualquier plantilla de la web. */
	.term-btn,
	.term {
		--term-bg: #171421;
		--term-fg: #d0cfcc;
		--term-green: #8ae234;
		--term-blue: #729fcf;
		--term-red: #ef2929;
		--term-muted: #a6a5a2;
		--term-ease: cubic-bezier(0.16, 1, 0.3, 1);
	}
	.term-btn {
		position: fixed;
		right: max(1rem, env(safe-area-inset-right));
		bottom: max(1rem, env(safe-area-inset-bottom));
		z-index: 60;
		width: 48px;
		height: 48px;
		display: grid;
		place-items: center;
		padding: 0;
		border: 1px solid rgb(255 255 255 / 0.16);
		border-radius: 14px;
		background: var(--term-bg);
		color: var(--term-green);
		box-shadow: 0 10px 28px -12px rgb(0 0 0 / 0.55);
		cursor: pointer;
		view-transition-name: site-terminal-btn;
		transition:
			transform 0.15s var(--term-ease),
			box-shadow 0.2s;
	}
	.term-btn:hover {
		box-shadow: 0 14px 32px -12px rgb(0 0 0 / 0.65);
	}
	.term-btn:active {
		transform: scale(0.94);
	}
	.term-btn:focus-visible,
	.x:focus-visible {
		outline: 2px solid var(--term-blue);
		outline-offset: 3px;
	}
	.term {
		position: fixed;
		right: max(1rem, env(safe-area-inset-right));
		bottom: calc(max(1rem, env(safe-area-inset-bottom)) + 48px + 0.75rem);
		z-index: 60;
		width: min(42rem, calc(100vw - 2rem));
		height: min(27rem, calc(100dvh - 8rem));
		display: flex;
		flex-direction: column;
		border-radius: 12px;
		overflow: hidden;
		background: var(--term-bg);
		color: var(--term-fg);
		box-shadow:
			0 28px 70px -24px rgb(0 0 0 / 0.7),
			0 0 0 1px rgb(255 255 255 / 0.1);
		font:
			15px/1.5 'Ubuntu Mono',
			'DejaVu Sans Mono',
			ui-monospace,
			'Cascadia Mono',
			Menlo,
			Consolas,
			monospace;
		view-transition-name: site-terminal;
		/* Sale del icono: crece desde su esquina. */
		transform-origin: 100% 100%;
		opacity: 0;
		transform: translateY(10px) scale(0.96);
		visibility: hidden;
		transition:
			opacity 0.14s ease-in,
			transform 0.14s ease-in,
			visibility 0s linear 0.14s;
	}
	.term.is-open {
		opacity: 1;
		transform: none;
		visibility: visible;
		transition:
			opacity 0.22s var(--term-ease),
			transform 0.22s var(--term-ease),
			visibility 0s;
	}
	@media (prefers-reduced-motion: reduce) {
		.term,
		.term.is-open {
			transform: none;
		}
	}
	.bar {
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 6px 0 46px;
		background: #2b2a33;
		border-bottom: 1px solid #0b0a10;
		font-family: system-ui, sans-serif;
	}
	.title {
		flex: 1;
		min-width: 0;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
		color: #ececec;
		font-size: 13px;
		font-weight: 700;
	}
	.x {
		flex: none;
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.08);
		color: #ececec;
		cursor: pointer;
	}
	.x:hover {
		background: rgb(255 255 255 / 0.16);
	}
	.screen {
		flex: 1;
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		padding: 10px 14px 14px;
		cursor: text;
		scrollbar-color: #4a4757 transparent;
	}
	.ln {
		margin: 0;
		min-height: 1.5em;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.row {
		display: flex;
		align-items: baseline;
		gap: 1ch;
	}
	.prompt {
		flex: none;
		white-space: nowrap;
	}
	input {
		flex: 1;
		min-width: 4ch;
		padding: 0;
		border: 0;
		outline: none;
		background: transparent;
		color: inherit;
		font: inherit;
		caret-color: var(--term-fg);
		caret-shape: block;
	}
	.u {
		color: var(--term-green);
		font-weight: 700;
	}
	.p,
	.d {
		color: var(--term-blue);
		font-weight: 700;
	}
	.err {
		color: var(--term-red);
	}
	.m {
		color: var(--term-muted);
	}
	@media (max-width: 40rem) {
		.term-btn {
			right: max(0.75rem, env(safe-area-inset-right));
			bottom: max(0.75rem, env(safe-area-inset-bottom));
		}
		.term {
			left: 0.5rem;
			right: 0.5rem;
			width: auto;
			bottom: calc(max(0.75rem, env(safe-area-inset-bottom)) + 48px + 0.5rem);
			height: min(60dvh, 26rem);
			/* 16 px evita que el móvil amplíe la página al escribir. */
			font-size: 16px;
		}
	}
</style>
