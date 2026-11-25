import type { SupabaseClient } from '@supabase/supabase-js';
import bundled from '../content/site.json';
import { LANGS, type CollectionKey, type L10n, type Lang, type SiteContent } from '../content/types';
import { SUPABASE } from '../config';
import { allTargets, COLLECTIONS, resolveTarget, reviewKey, type SectionId, type TargetInfo } from './schema';
import { getSupabase } from './supabase';

export interface PendingAsset {
	/** Ruta provisional que usa el contenido hasta que se publica. */
	publicPath: string;
	/** Ruta dentro del bucket de Supabase Storage. */
	storagePath: string;
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

export interface Version {
	id: number;
	created_at: string;
}

export type FieldStatus = 'missing' | 'review' | 'changed' | 'ok';
export type Phase = 'loading' | 'unconfigured' | 'login' | 'error' | 'ready';

const DRAFT_KEY = 'portfolio-cms:draft';

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

export function formatDate(iso: string): string {
	return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

class PublishError extends Error {}

export class Editor {
	published = $state<SiteContent>(copy(bundled as SiteContent));
	draft = $state<SiteContent>(copy(bundled as SiteContent));
	pending = $state<Record<string, PendingAsset>>({});

	lang = $state<Lang>('es');
	device = $state<'desktop' | 'mobile'>('desktop');
	scheme = $state<'light' | 'dark'>('light');
	selected = $state('hero.subtitle');

	phase = $state<Phase>('loading');
	/** Editor sin Supabase (solo en desarrollo local): se puede editar, pero no publicar. */
	offline = $state(false);
	email = $state('');
	loginError = $state<string | null>(null);
	fatal = $state('');
	/** Fecha de la versión publicada que se cargó; sirve para detectar si alguien publicó entretanto. */
	remoteUpdatedAt = $state<string | null>(null);
	history = $state<Version[]>([]);
	needsRebuild = $state(false);
	busy = $state(false);
	ready = $state(false);
	toast = $state<{ text: string; tone: 'ok' | 'error' } | null>(null);

	changes = $derived(countChanges(this.draft, this.published));
	info = $derived(resolveTarget(this.draft, this.selected));
	issues = $derived(this.collectIssues());

	#supabase: SupabaseClient | null = null;
	#toastTimer: ReturnType<typeof setTimeout> | undefined;
	#warnedQuota = false;

	// Sesión y carga

	async init(options: { allowOffline: boolean }) {
		this.#supabase = getSupabase();
		if (!this.#supabase) {
			if (options.allowOffline) {
				this.offline = true;
				this.#restoreDraft();
				this.phase = 'ready';
				this.ready = true;
			} else {
				this.phase = 'unconfigured';
			}
			return;
		}
		const { data } = await this.#supabase.auth.getSession();
		if (!data.session) {
			this.phase = 'login';
			return;
		}
		await this.#start(data.session.user.email ?? '');
	}

	async login(email: string, password: string): Promise<string | null> {
		if (!this.#supabase) return 'Supabase no está configurado.';
		this.loginError = null;
		const { data, error } = await this.#supabase.auth.signInWithPassword({ email: email.trim(), password });
		if (error || !data.session) {
			if (error?.status === 429) return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.';
			if (error?.name === 'AuthRetryableFetchError' || error?.status === 0) {
				return 'No se ha podido conectar con Supabase. Revisa tu conexión y vuelve a intentarlo.';
			}
			return 'El correo o la contraseña no son correctos.';
		}
		await this.#start(data.user.email ?? '');
		return this.loginError;
	}

	async logout() {
		await this.#supabase?.auth.signOut();
		this.email = '';
		this.ready = false;
		this.phase = 'login';
	}

	async retry() {
		this.phase = 'loading';
		await this.init({ allowOffline: false });
	}

	async #start(email: string) {
		const sb = this.#supabase!;
		const { data: isAdmin, error: adminError } = await sb.rpc('is_admin');
		if (adminError || isAdmin !== true) {
			await sb.auth.signOut();
			this.loginError = 'Esta cuenta no tiene permiso para editar el portafolio.';
			this.phase = 'login';
			return;
		}
		const { data, error } = await sb.from('site_content').select('content, updated_at').eq('id', 'main').maybeSingle();
		if (error) {
			this.fatal = 'No se ha podido leer el contenido de Supabase. Revisa tu conexión y vuelve a intentarlo.';
			this.phase = 'error';
			return;
		}
		if (data) {
			this.published = data.content as SiteContent;
			this.remoteUpdatedAt = data.updated_at as string;
		}
		this.email = email;
		this.#restoreDraft();
		this.phase = 'ready';
		this.ready = true;
		if (this.changes > 0) this.notify('Has recuperado tu borrador sin publicar.', 'ok');
		void this.loadHistory();
	}

	#restoreDraft() {
		try {
			const saved = localStorage.getItem(DRAFT_KEY);
			if (saved) {
				const parsed = JSON.parse(saved) as { content: SiteContent; pending?: Record<string, PendingAsset> };
				this.draft = parsed.content;
				this.pending = parsed.pending ?? {};
				return;
			}
		} catch {
			/* borrador ilegible: se ignora */
		}
		this.draft = copy(this.published);
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
		return this.pending[src]?.dataUrl ?? src;
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
						out.push({ target, title: info.title, field: info.single ? '' : f.label, lang, kind: s, section: info.section });
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
		this.pending[publicPath] = { publicPath, storagePath: `uploads/${name}`, dataUrl, name: file.name };
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
		const next = list[Math.min(index, list.length - 1)];
		this.selected = COLLECTIONS[info.collection] && next ? `${info.collection}:${next.id}` : 'hero.subtitle';
	}

	discard() {
		if (!confirm(`¿Descartar ${this.changes === 1 ? 'el cambio' : `los ${this.changes} cambios`} sin publicar?`)) return;
		this.draft = copy(this.published);
		this.pending = {};
		if (!resolveTarget(this.draft, this.selected)) this.selected = 'hero.subtitle';
		this.notify('Cambios descartados.', 'ok');
	}

	// Historial

	async loadHistory() {
		if (!this.#supabase) return;
		const { data, error } = await this.#supabase
			.from('site_content_versions')
			.select('id, created_at')
			.order('id', { ascending: false })
			.limit(15);
		if (!error && data) this.history = data as Version[];
	}

	async restoreVersion(version: Version) {
		if (!this.#supabase) return;
		if (this.changes > 0 && !confirm('Tienes cambios sin publicar. ¿Quieres sustituirlos por esta versión?')) return;
		const { data, error } = await this.#supabase.from('site_content_versions').select('content').eq('id', version.id).single();
		if (error || !data) {
			this.notify('No se ha podido cargar esa versión. Vuelve a intentarlo.', 'error');
			return;
		}
		this.draft = data.content as SiteContent;
		this.pending = {};
		if (!resolveTarget(this.draft, this.selected)) this.selected = 'hero.subtitle';
		this.notify(`Has cargado la versión del ${formatDate(version.created_at)}. Revísala y pulsa «Publicar» para recuperarla.`, 'ok');
	}

	// Publicación

	async publish() {
		if (this.busy || this.changes === 0) return;
		const sb = this.#supabase;
		if (!sb) {
			this.notify('En modo local no se puede publicar. Configura Supabase en src/lib/config.ts.', 'error');
			return;
		}
		this.busy = true;
		try {
			let json = JSON.stringify(clean(copy(this.draft)));

			// 1. Sube a Storage los archivos nuevos que sigan en uso y cambia sus rutas por la URL pública.
			const bucket = sb.storage.from(SUPABASE.bucket);
			for (const asset of Object.values($state.snapshot(this.pending))) {
				const placeholder = JSON.stringify(asset.publicPath);
				if (!json.includes(placeholder)) continue;
				const blob = await (await fetch(asset.dataUrl)).blob();
				const { error } = await bucket.upload(asset.storagePath, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' });
				if (error) throw new PublishError(`No se ha podido subir «${asset.name}». Comprueba que es una imagen o un PDF de menos de 8 MB.`);
				json = json.replaceAll(placeholder, JSON.stringify(bucket.getPublicUrl(asset.storagePath).data.publicUrl));
			}
			const content = JSON.parse(json) as SiteContent;

			// 2. Guarda el contenido solo si nadie lo ha cambiado desde que se cargó.
			let savedAt: string;
			if (this.remoteUpdatedAt) {
				const { data, error } = await sb
					.from('site_content')
					.update({ content })
					.eq('id', 'main')
					.eq('updated_at', this.remoteUpdatedAt)
					.select('updated_at');
				if (error) throw new PublishError('Supabase no ha aceptado el cambio. Vuelve a entrar y prueba de nuevo.');
				if (!data.length) {
					throw new PublishError('El contenido ha cambiado desde que abriste el editor. Recarga la página para traer la última versión; tu borrador se mantiene.');
				}
				savedAt = data[0].updated_at as string;
			} else {
				const { data, error } = await sb.from('site_content').insert({ id: 'main', content }).select('updated_at').single();
				if (error) throw new PublishError('No se ha podido guardar el contenido. Recarga la página y vuelve a intentarlo.');
				savedAt = data.updated_at as string;
			}

			this.published = copy(content);
			this.draft = copy(content);
			this.pending = {};
			this.remoteUpdatedAt = savedAt;
			localStorage.removeItem(DRAFT_KEY);
			void this.loadHistory();

			// 3. Pide a GitHub que vuelva a generar la web con el contenido nuevo.
			await this.rebuild(true);
		} catch (err) {
			this.notify(err instanceof PublishError ? err.message : 'No se ha podido publicar. Revisa tu conexión y vuelve a intentarlo.', 'error');
		} finally {
			this.busy = false;
		}
	}

	async rebuild(afterSave = false) {
		if (!this.#supabase) return;
		const { error } = await this.#supabase.functions.invoke('publish', { method: 'POST' });
		if (error) {
			this.needsRebuild = true;
			this.notify(
				afterSave
					? 'Guardado en Supabase, pero GitHub no ha recibido el aviso para actualizar la web. Pulsa «Actualizar la web» para reintentarlo.'
					: 'GitHub no ha recibido el aviso para actualizar la web. Vuelve a intentarlo en unos minutos.',
				'error'
			);
			return;
		}
		this.needsRebuild = false;
		this.notify(afterSave ? 'Publicado. La web se actualizará en uno o dos minutos.' : 'Hecho. La web se actualizará en uno o dos minutos.', 'ok');
	}
}
