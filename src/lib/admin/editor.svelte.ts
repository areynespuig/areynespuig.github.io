import bundled from '../content/site.json';
import { LANGS, type CollectionKey, type L10n, type Lang, type SiteContent } from '../content/types';
import { SITE } from '../config';
import { allTargets, COLLECTIONS, resolveTarget, reviewKey, type SectionId, type TargetInfo } from './schema';
import { commitFiles, checkAccess, fetchContent, utf8ToBase64, GitHubError } from './github';

export interface PendingAsset {
	repoPath: string;
	publicPath: string;
	dataUrl: string;
	name: string;
}

export interface Issue {
	target: string;
	title: string;
	field: string;
	lang: Lang;
	kind: 'missing' | 'review';
	section: SectionId;
}

export type FieldStatus = 'missing' | 'review' | 'changed' | 'ok';

const DRAFT_KEY = 'portfolio-cms:draft';
const TOKEN_KEY = 'portfolio-cms:token';

function copy<T>(value: T): T {
	return structuredClone($state.snapshot(value)) as T;
}

function hasText(v: unknown): boolean {
	if (Array.isArray(v)) return v.some((s) => String(s).trim() !== '');
	return typeof v === 'string' && v.trim() !== '';
}

function same(a: unknown, b: unknown): boolean {
	const norm = (v: unknown) => (Array.isArray(v) ? v.filter((s) => String(s).trim() !== '') : v);
	return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/** Aplana el contenido a «ruta → valor» para contar cuántas cosas han cambiado. */
function flatten(content: SiteContent): Map<string, string> {
	const out = new Map<string, string>();
	const walk = (value: unknown, path: string) => {
		if (Array.isArray(value)) {
			if (value.length && typeof value[0] === 'object' && value[0] && 'id' in value[0]) {
				out.set(`${path}#order`, value.map((i) => i.id).join(','));
				for (const item of value) walk(item, `${path}:${item.id}`);
			} else {
				out.set(path, JSON.stringify(value.filter((s) => String(s).trim() !== '')));
			}
		} else if (value && typeof value === 'object') {
			for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
		} else {
			out.set(path, JSON.stringify(value ?? null));
		}
	};
	const { meta: _meta, ...rest } = content;
	walk(rest, '');
	return out;
}

const ITEM = /^(education|experience|projects):[^.#]+/;

/** Cuenta campos cambiados; una entrada añadida o quitada cuenta como un solo cambio. */
function countChanges(a: SiteContent, b: SiteContent): number {
	const fa = flatten(a);
	const fb = flatten(b);
	const itemsA = new Set([...fa.keys()].map((k) => ITEM.exec(k)?.[0]).filter(Boolean));
	const itemsB = new Set([...fb.keys()].map((k) => ITEM.exec(k)?.[0]).filter(Boolean));
	const addedOrRemoved = new Set([...itemsA].filter((i) => !itemsB.has(i)).concat([...itemsB].filter((i) => !itemsA.has(i))));
	let n = addedOrRemoved.size;
	for (const k of new Set([...fa.keys(), ...fb.keys()])) {
		const item = ITEM.exec(k)?.[0];
		if (item && addedOrRemoved.has(item)) continue;
		if (k.endsWith('#order')) {
			const collection = k.slice(0, -'#order'.length);
			const sameMembers = ![...addedOrRemoved].some((i) => i!.startsWith(`${collection}:`));
			if (sameMembers && fa.get(k) !== fb.get(k)) n++;
			continue;
		}
		if (fa.get(k) !== fb.get(k)) n++;
	}
	return n;
}

/** Deja el contenido listo para guardar: sin líneas vacías ni avisos huérfanos. */
function clean(content: SiteContent): SiteContent {
	for (const l of LANGS) content.about.skills[l] = content.about.skills[l].map((s) => s.trim()).filter(Boolean);
	const valid = new Set<string>();
	for (const t of allTargets(content)) {
		const info = resolveTarget(content, t);
		if (info) for (const f of info.fields) valid.add(reviewKey(info, f.key));
	}
	for (const [k, langs] of Object.entries(content.meta.review)) {
		if (!valid.has(k) || !langs.length) delete content.meta.review[k];
	}
	return content;
}

function readFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

function slug(name: string): string {
	return (
		name
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 40) || 'archivo'
	);
}

export class Editor {
	published = $state<SiteContent>(copy(bundled as SiteContent));
	draft = $state<SiteContent>(copy(bundled as SiteContent));
	pending = $state<Record<string, PendingAsset>>({});
	/** Archivos ya publicados que la web desplegada todavía no sirve. */
	recent = $state<Record<string, string>>({});

	lang = $state<Lang>('es');
	device = $state<'desktop' | 'mobile'>('desktop');
	scheme = $state<'light' | 'dark'>('light');
	selected = $state('hero.subtitle');

	remoteSha = $state<string | null>(null);
	loadedFrom = $state<'github' | 'local'>('local');
	token = $state<string | null>(null);
	connectOpen = $state(false);
	busy = $state(false);
	ready = $state(false);
	toast = $state<{ text: string; tone: 'ok' | 'error' } | null>(null);

	changes = $derived(countChanges(this.draft, this.published));
	info = $derived(resolveTarget(this.draft, this.selected));
	issues = $derived(this.collectIssues());

	#toastTimer: ReturnType<typeof setTimeout> | undefined;
	#publishAfterConnect = false;
	#warnedQuota = false;

	async init() {
		try {
			this.token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
		} catch {
			this.token = null;
		}

		try {
			const remote = await fetchContent(this.token);
			if (remote) {
				this.published = JSON.parse(remote.text) as SiteContent;
				this.remoteSha = remote.sha;
				this.loadedFrom = 'github';
			}
		} catch {
			// Sin conexión con GitHub: se edita sobre el contenido que viene con el código.
		}

		let restored = false;
		try {
			const saved = localStorage.getItem(DRAFT_KEY);
			if (saved) {
				const parsed = JSON.parse(saved) as { content: SiteContent; pending?: Record<string, PendingAsset> };
				this.draft = parsed.content;
				this.pending = parsed.pending ?? {};
				restored = true;
			}
		} catch {
			/* borrador ilegible: se ignora */
		}
		if (!restored) this.draft = copy(this.published);
		this.ready = true;
		if (restored && this.changes > 0) this.notify('Has recuperado tu borrador sin publicar.', 'ok');
	}

	persist() {
		const content = $state.snapshot(this.draft);
		const pending = $state.snapshot(this.pending);
		if (!this.ready) return;
		try {
			if (this.changes === 0) localStorage.removeItem(DRAFT_KEY);
			else localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, pending }));
		} catch {
			if (!this.#warnedQuota) {
				this.#warnedQuota = true;
				this.notify('El borrador es demasiado grande para guardarlo en el navegador. Publica pronto para no perder las imágenes nuevas.', 'error');
			}
		}
	}

	notify(text: string, tone: 'ok' | 'error' = 'ok') {
		this.toast = { text, tone };
		clearTimeout(this.#toastTimer);
		this.#toastTimer = setTimeout(() => (this.toast = null), tone === 'error' ? 9000 : 4500);
	}

	// Selección

	select(target: string) {
		this.selected = target;
	}

	/** Selecciona un bloque y lo lleva a la vista previa. */
	reveal(target: string, lang?: Lang) {
		this.selected = target;
		if (lang) this.lang = lang;
		requestAnimationFrame(() => {
			const el = document.querySelector(`[data-target="${CSS.escape(target)}"]`);
			el?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
		});
	}

	asset(src: string): string {
		return this.pending[src]?.dataUrl ?? this.recent[src] ?? src;
	}

	// Estado de los campos

	isFlagged(target: string): boolean {
		const info = resolveTarget(this.draft, target);
		if (!info) return false;
		return info.fields.some((f) => this.draft.meta.review[reviewKey(info, f.key)]?.includes(this.lang));
	}

	publishedValue(info: TargetInfo, key: string): unknown {
		return resolveTarget(this.published, info.target)?.obj[key];
	}

	status(info: TargetInfo, key: string, lang: Lang): FieldStatus {
		const value = (info.obj[key] as Record<Lang, unknown>)[lang];
		if (!hasText(value)) return 'missing';
		if (this.draft.meta.review[reviewKey(info, key)]?.includes(lang)) return 'review';
		const pub = this.publishedValue(info, key) as Record<Lang, unknown> | undefined;
		if (!pub || !same(value, pub[lang])) return 'changed';
		return 'ok';
	}

	collectIssues(): Issue[] {
		const out: Issue[] = [];
		for (const target of allTargets(this.draft)) {
			const info = resolveTarget(this.draft, target);
			if (!info) continue;
			for (const f of info.fields) {
				if (f.type !== 'l10n' && f.type !== 'l10nList') continue;
				for (const lang of LANGS) {
					const s = this.status(info, f.key, lang);
					if (s === 'missing' || s === 'review') {
						out.push({
							target,
							title: info.title,
							field: info.single ? '' : f.label,
							lang,
							kind: s,
							section: info.section
						});
					}
				}
			}
		}
		return out;
	}

	// Edición

	#flagOthers(info: TargetInfo, key: string, lang: Lang) {
		const rk = reviewKey(info, key);
		const review = this.draft.meta.review;
		const flags = new Set(review[rk] ?? []);
		flags.delete(lang);
		const pub = this.publishedValue(info, key) as Record<Lang, unknown> | undefined;
		if (pub) {
			const field = info.obj[key] as Record<Lang, unknown>;
			for (const other of LANGS) {
				if (other === lang) continue;
				// Si el otro idioma sigue como estaba publicado, puede haberse quedado atrás.
				if (same(field[other], pub[other]) && hasText(field[other])) flags.add(other);
			}
		}
		if (flags.size) review[rk] = LANGS.filter((l) => flags.has(l));
		else delete review[rk];
	}

	setText(info: TargetInfo, key: string, lang: Lang, value: string) {
		(info.obj[key] as L10n)[lang] = value;
		this.#flagOthers(info, key, lang);
	}

	setList(info: TargetInfo, key: string, lang: Lang, value: string) {
		(info.obj[key] as Record<Lang, string[]>)[lang] = value.split('\n');
		this.#flagOthers(info, key, lang);
	}

	setValue(info: TargetInfo, key: string, value: unknown) {
		info.obj[key] = value;
		if (key === 'ongoing' && value === true) info.obj.end = null;
	}

	accept(info: TargetInfo, key: string, lang: Lang) {
		const rk = reviewKey(info, key);
		const rest = (this.draft.meta.review[rk] ?? []).filter((l) => l !== lang);
		if (rest.length) this.draft.meta.review[rk] = rest;
		else delete this.draft.meta.review[rk];
	}

	async upload(info: TargetInfo, key: string, file: File) {
		if (file.size > 8 * 1024 * 1024) {
			this.notify('El archivo pesa más de 8 MB. Redúcelo antes de subirlo.', 'error');
			return;
		}
		const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
		const name = `${slug(file.name.replace(/\.[^.]+$/, ''))}-${Date.now().toString(36)}.${ext}`;
		const publicPath = `/uploads/${name}`;
		const dataUrl = await readFile(file);
		this.pending[publicPath] = { repoPath: `${SITE.uploadsDir}/${name}`, publicPath, dataUrl, name: file.name };
		info.obj[key] = publicPath;
	}

	add(collection: CollectionKey) {
		const id = `${collection === 'education' ? 'estudio' : collection === 'experience' ? 'experiencia' : 'proyecto'}-${Date.now().toString(36)}`;
		const empty = (): L10n => ({ es: '', ca: '', en: '' });
		if (collection === 'education') {
			this.draft.education.unshift({ id, title: empty(), school: empty(), start: null, end: null, ongoing: false });
		} else if (collection === 'experience') {
			this.draft.experience.unshift({ id, role: empty(), company: '', kind: empty(), start: null, end: null, ongoing: false, description: empty() });
		} else {
			this.draft.projects.unshift({ id, title: '', description: empty(), image: '', imageAlt: empty(), url: '', year: null });
		}
		this.reveal(`${collection}:${id}`);
	}

	move(info: TargetInfo, direction: -1 | 1) {
		if (!info.collection) return;
		const list = this.draft[info.collection] as Array<{ id: string }>;
		const from = list.findIndex((i) => i.id === info.id);
		const to = from + direction;
		if (from < 0 || to < 0 || to >= list.length) return;
		const [item] = list.splice(from, 1);
		list.splice(to, 0, item);
		this.reveal(info.target);
	}

	canMove(info: TargetInfo, direction: -1 | 1): boolean {
		if (!info.collection) return false;
		const list = this.draft[info.collection] as Array<{ id: string }>;
		const to = list.findIndex((i) => i.id === info.id) + direction;
		return to >= 0 && to < list.length;
	}

	remove(info: TargetInfo) {
		if (!info.collection) return;
		const ok = confirm(`¿Quitar «${info.title}» de la web? Puedes recuperarlo con «Descartar» mientras no publiques.`);
		if (!ok) return;
		const list = this.draft[info.collection] as Array<{ id: string }>;
		const index = list.findIndex((i) => i.id === info.id);
		if (index >= 0) list.splice(index, 1);
		for (const k of Object.keys(this.draft.meta.review)) if (k.startsWith(`${info.target}.`)) delete this.draft.meta.review[k];
		this.selected = COLLECTIONS[info.collection] && list[Math.min(index, list.length - 1)]
			? `${info.collection}:${list[Math.min(index, list.length - 1)].id}`
			: 'hero.subtitle';
	}

	discard() {
		if (!confirm(`¿Descartar ${this.changes === 1 ? 'el cambio' : `los ${this.changes} cambios`} sin publicar?`)) return;
		this.draft = copy(this.published);
		this.pending = {};
		if (!resolveTarget(this.draft, this.selected)) this.selected = 'hero.subtitle';
		this.notify('Cambios descartados.', 'ok');
	}

	// GitHub

	async connect(token: string, remember: boolean): Promise<string | null> {
		const value = token.trim();
		if (!value) return 'Pega el token para continuar.';
		try {
			await checkAccess(value);
		} catch (err) {
			return err instanceof GitHubError ? err.message : 'No se ha podido comprobar el token.';
		}
		try {
			localStorage.removeItem(TOKEN_KEY);
			sessionStorage.removeItem(TOKEN_KEY);
			(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, value);
		} catch {
			/* sin almacenamiento: dura hasta cerrar la pestaña */
		}
		this.token = value;
		this.connectOpen = false;
		this.notify('Conectado con GitHub.', 'ok');
		if (this.#publishAfterConnect) {
			this.#publishAfterConnect = false;
			await this.publish();
		}
		return null;
	}

	disconnect() {
		try {
			localStorage.removeItem(TOKEN_KEY);
			sessionStorage.removeItem(TOKEN_KEY);
		} catch {
			/* nada que borrar */
		}
		this.token = null;
		this.notify('Desconectado de GitHub. El token se ha borrado de este navegador.', 'ok');
	}

	openConnect(publishAfter = false) {
		this.#publishAfterConnect = publishAfter;
		this.connectOpen = true;
	}

	async publish() {
		if (this.busy || this.changes === 0) return;
		if (!this.token) {
			this.openConnect(true);
			return;
		}
		this.busy = true;
		try {
			const content = clean(copy(this.draft));
			const json = JSON.stringify(content, null, 2) + '\n';
			const used = Object.values($state.snapshot(this.pending)).filter((a) => json.includes(`"${a.publicPath}"`));
			const count = this.changes;
			const result = await commitFiles(this.token, {
				expectedContentSha: this.remoteSha,
				message: `Actualiza el portafolio desde el editor (${count} ${count === 1 ? 'cambio' : 'cambios'})`,
				files: [
					{ path: SITE.contentPath, base64: utf8ToBase64(json) },
					...used.map((a) => ({ path: a.repoPath, base64: a.dataUrl.slice(a.dataUrl.indexOf(',') + 1) }))
				]
			});
			for (const a of used) this.recent[a.publicPath] = a.dataUrl;
			this.published = copy(content);
			this.draft = copy(content);
			this.pending = {};
			this.remoteSha = result.contentSha;
			this.loadedFrom = 'github';
			localStorage.removeItem(DRAFT_KEY);
			this.notify('Publicado. La web se actualizará en uno o dos minutos.', 'ok');
		} catch (err) {
			if (err instanceof GitHubError && err.kind === 'auth') this.token = null;
			this.notify(err instanceof GitHubError ? err.message : 'No se ha podido publicar. Vuelve a intentarlo.', 'error');
		} finally {
			this.busy = false;
		}
	}
}

