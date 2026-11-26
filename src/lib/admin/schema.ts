import type { BuiltinSection, CollectionKey, CustomSection, Education, Experience, Project, SectionItem, SiteContent } from '../content/types';
import { isBuiltin, LAYOUT_INFO, sectionOrder } from '../content/sections';
import { SECTION_LAYOUTS } from '../content/types';

/** Nombre de las secciones de serie en el editor. */
export const BUILTIN_NAMES: Record<BuiltinSection, string> = {
	sobre: 'Sobre mí',
	educacion: 'Educación',
	experiencia: 'Experiencia',
	proyectos: 'Proyectos'
};

export function sectionName(section: CustomSection): string {
	const t = section.title;
	return t.es.trim() || t.ca.trim() || t.en.trim() || 'Sección sin título';
}

/** Todas las secciones de la página, en el orden en que se ven: la portada y después las demás. */
export function sectionList(c: SiteContent): { id: string; name: string }[] {
	const custom = new Map((c.sections ?? []).map((s) => [s.id, s]));
	return [
		{ id: 'inicio', name: 'Portada' },
		...sectionOrder(c).map((id) => ({
			id,
			name: isBuiltin(id) ? BUILTIN_NAMES[id] : sectionName(custom.get(id)!)
		}))
	];
}

export type FieldDef =
	/** `optional`: si está vacío en los tres idiomas no se avisa; si se rellena en uno, sí se piden los otros. */
	| { key: string; label: string; type: 'l10n'; long?: boolean; optional?: boolean; hint?: string }
	| { key: string; label: string; type: 'l10nList'; hint: string; optional?: boolean }
	| { key: string; label: string; type: 'text' | 'url'; placeholder?: string }
	| { key: string; label: string; type: 'year' }
	| { key: string; label: string; type: 'bool' }
	| { key: string; label: string; type: 'image' | 'pdf'; hint?: string }
	/** Zoom y posición de una imagen dentro de su recuadro; `image` es el campo con la imagen. */
	| { key: string; label: string; type: 'imageFrame'; image: string }
	| { key: string; label: string; type: 'choice'; options: { value: string; label: string; hint: string }[] };

export interface TargetInfo {
	target: string;
	title: string;
	/** Id de la sección de la página donde está el bloque. */
	section: string;
	fields: FieldDef[];
	/** Objeto del contenido que guarda los campos (se edita directamente). */
	obj: Record<string, any>;
	/** Lista del contenido que contiene esta entrada: permite moverla y quitarla. */
	list?: Array<{ id: string }>;
	id?: string;
	/** Bloque que se selecciona al quitar la entrada si la lista se queda vacía. */
	parent?: string;
	/** El bloque es una sección entera: se mueve entre las demás secciones. */
	isSection?: boolean;
	/** Sección de serie: se puede mover, pero no quitar ni cambiar su título. */
	builtin?: boolean;
	/** Bloque de un único texto: el inspector no repite su etiqueta. */
	single?: boolean;
}

export const COLLECTIONS: Record<
	CollectionKey,
	{ section: BuiltinSection; add: string; fresh: string; fields: FieldDef[] }
> = {
	education: {
		section: 'educacion',
		add: 'Añadir estudio',
		fresh: 'Nuevo estudio',
		fields: [
			{ key: 'title', label: 'Titulación', type: 'l10n' },
			{ key: 'school', label: 'Centro', type: 'l10n' },
			{ key: 'start', label: 'Año de inicio', type: 'year' },
			{ key: 'end', label: 'Año de fin', type: 'year' },
			{ key: 'ongoing', label: 'En curso', type: 'bool' }
		]
	},
	experience: {
		section: 'experiencia',
		add: 'Añadir experiencia',
		fresh: 'Nueva experiencia',
		fields: [
			{ key: 'role', label: 'Puesto', type: 'l10n' },
			{ key: 'company', label: 'Empresa', type: 'text' },
			{ key: 'kind', label: 'Tipo', type: 'l10n' },
			{ key: 'start', label: 'Año de inicio', type: 'year' },
			{ key: 'end', label: 'Año de fin', type: 'year' },
			{ key: 'ongoing', label: 'En curso', type: 'bool' },
			{ key: 'description', label: 'Tareas', type: 'l10n', long: true }
		]
	},
	projects: {
		section: 'proyectos',
		add: 'Añadir proyecto',
		fresh: 'Nuevo proyecto',
		fields: [
			{ key: 'title', label: 'Nombre', type: 'text' },
			{ key: 'description', label: 'Descripción', type: 'l10n', long: true },
			{ key: 'image', label: 'Imagen', type: 'image' },
			{ key: 'imageAlt', label: 'Descripción de la imagen', type: 'l10n' },
			{ key: 'url', label: 'Enlace', type: 'url', placeholder: 'https://' },
			{ key: 'year', label: 'Año', type: 'year' }
		]
	}
};

const LAYOUT_FIELD: FieldDef = {
	key: 'layout',
	label: 'Tipo de sección',
	type: 'choice',
	options: SECTION_LAYOUTS.map((value) => ({ value, ...LAYOUT_INFO[value] }))
};

function sectionFields(section: CustomSection): FieldDef[] {
	const title: FieldDef = { key: 'title', label: 'Título de la sección', type: 'l10n' };
	if (section.layout === 'text') {
		return [
			title,
			LAYOUT_FIELD,
			{ key: 'body', label: 'Texto', type: 'l10n', long: true, optional: true, hint: 'Deja una línea en blanco para empezar otro párrafo.' },
			{ key: 'points', label: 'Lista de puntos', type: 'l10nList', optional: true, hint: 'Opcional. Un punto por línea.' }
		];
	}
	return [
		title,
		LAYOUT_FIELD,
		{ key: 'body', label: 'Introducción', type: 'l10n', long: true, optional: true, hint: 'Opcional. Un texto corto antes de las entradas.' }
	];
}

const ITEM_FIELDS: Record<'list' | 'cards', FieldDef[]> = {
	list: [
		{ key: 'title', label: 'Título', type: 'l10n' },
		{ key: 'subtitle', label: 'Centro, empresa o entidad', type: 'l10n', optional: true },
		{ key: 'start', label: 'Año de inicio', type: 'year' },
		{ key: 'end', label: 'Año de fin', type: 'year' },
		{ key: 'ongoing', label: 'En curso', type: 'bool' },
		{ key: 'description', label: 'Descripción', type: 'l10n', long: true, optional: true },
		{ key: 'url', label: 'Enlace', type: 'url', placeholder: 'https://' }
	],
	cards: [
		{ key: 'title', label: 'Título', type: 'l10n' },
		{ key: 'description', label: 'Descripción', type: 'l10n', long: true, optional: true },
		{ key: 'image', label: 'Imagen', type: 'image' },
		{ key: 'imageAlt', label: 'Descripción de la imagen', type: 'l10n', optional: true },
		{ key: 'url', label: 'Enlace', type: 'url', placeholder: 'https://' },
		{ key: 'start', label: 'Año', type: 'year' }
	]
};

function single(
	target: string,
	title: string,
	section: string,
	obj: Record<string, any>,
	field: FieldDef
): TargetInfo {
	return { target, title, section, obj, fields: [field], single: true };
}

export function itemTitle(collection: CollectionKey, item: Education | Experience | Project): string {
	const fresh = COLLECTIONS[collection].fresh;
	if (collection === 'projects') return (item as Project).title.trim() || fresh;
	if (collection === 'education') {
		const t = (item as Education).title;
		return t.es.trim() || t.ca.trim() || t.en.trim() || fresh;
	}
	const e = item as Experience;
	const role = e.role.es.trim() || e.role.ca.trim() || e.role.en.trim();
	if (role && e.company.trim()) return `${role} en ${e.company.trim()}`;
	return role || e.company.trim() || fresh;
}

function sectionItemTitle(item: SectionItem): string {
	const t = item.title;
	return t.es.trim() || t.ca.trim() || t.en.trim() || 'Entrada sin título';
}

/** Bloques de una sección nueva: «section:id» (la sección) y «section:id/entrada» (cada entrada). */
function resolveSectionTarget(c: SiteContent, target: string): TargetInfo | null {
	const match = /^section:([^/]+)(?:\/(.+))?$/.exec(target);
	if (!match) return null;
	const [, sectionId, itemId] = match;
	if (isBuiltin(sectionId)) {
		if (itemId) return null;
		return { target, title: BUILTIN_NAMES[sectionId], section: sectionId, obj: {}, fields: [], isSection: true, builtin: true, id: sectionId };
	}
	const section = c.sections?.find((s) => s.id === sectionId);
	if (!section) return null;
	if (!itemId) {
		return { target, title: sectionName(section), section: section.id, obj: section, fields: sectionFields(section), isSection: true, id: section.id };
	}
	if (section.layout === 'text') return null;
	const item = section.items.find((i) => i.id === itemId);
	if (!item) return null;
	return {
		target,
		title: sectionItemTitle(item),
		section: section.id,
		obj: item,
		fields: ITEM_FIELDS[section.layout],
		list: section.items,
		id: item.id,
		parent: `section:${section.id}`
	};
}

/** Traduce un identificador de bloque («hero.subtitle», «projects:salutsegura»…) a lo que se puede editar. */
export function resolveTarget(c: SiteContent, target: string): TargetInfo | null {
	switch (target) {
		case 'photo':
			return {
				target,
				title: 'Foto de perfil',
				section: 'inicio',
				obj: c.profile,
				fields: [
					{ key: 'photo', label: 'Imagen', type: 'image' },
					{ key: 'photoFrame', label: 'Encuadre', type: 'imageFrame', image: 'photo' },
					{ key: 'photoAlt', label: 'Descripción de la foto', type: 'l10n' }
				]
			};
		case 'profile':
			return {
				target,
				title: 'Perfil',
				section: 'inicio',
				obj: c.profile,
				fields: [
					{ key: 'name', label: 'Nombre', type: 'text' },
					{ key: 'cv', label: 'Currículum', type: 'pdf', hint: 'Es el archivo del botón «Descargar currículum».' },
					{ key: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://www.linkedin.com/in/…' },
					{ key: 'github', label: 'GitHub', type: 'url', placeholder: 'https://github.com/…' }
				]
			};
		case 'hero.availability':
			return single(target, 'Disponibilidad', 'inicio', c.hero, { key: 'availability', label: 'Disponibilidad', type: 'l10n' });
		case 'hero.greeting':
			return single(target, 'Saludo', 'inicio', c.hero, { key: 'greeting', label: 'Saludo', type: 'l10n' });
		case 'hero.subtitle':
			return single(target, 'Subtítulo', 'inicio', c.hero, { key: 'subtitle', label: 'Subtítulo', type: 'l10n', long: true });
		case 'about.bio':
			return single(target, 'Texto de presentación', 'sobre', c.about, { key: 'bio', label: 'Presentación', type: 'l10n', long: true });
		case 'about.skills':
			return single(target, 'Competencias clave', 'sobre', c.about, {
				key: 'skills',
				label: 'Competencias clave',
				type: 'l10nList',
				hint: 'Una competencia por línea. Cada línea es un punto de la lista.'
			});
	}
	if (target.startsWith('section:')) return resolveSectionTarget(c, target);
	const match = /^(education|experience|projects):(.+)$/.exec(target);
	if (!match) return null;
	const collection = match[1] as CollectionKey;
	const list = c[collection] as Array<Education | Experience | Project>;
	const item = list.find((i) => i.id === match[2]);
	if (!item) return null;
	return {
		target,
		title: itemTitle(collection, item),
		section: COLLECTIONS[collection].section,
		obj: item as unknown as Record<string, any>,
		fields: COLLECTIONS[collection].fields,
		list,
		id: item.id
	};
}

export function allTargets(c: SiteContent): string[] {
	return [
		'profile',
		'photo',
		'hero.availability',
		'hero.greeting',
		'hero.subtitle',
		'about.bio',
		'about.skills',
		...c.education.map((i) => `education:${i.id}`),
		...c.experience.map((i) => `experience:${i.id}`),
		...c.projects.map((i) => `projects:${i.id}`),
		// Las entradas de una sección de texto no se ven, así que no generan avisos.
		...(c.sections ?? []).flatMap((s) => [
			`section:${s.id}`,
			...(s.layout === 'text' ? [] : s.items.map((i) => `section:${s.id}/${i.id}`))
		])
	];
}

/** Clave con la que se guardan los avisos de revisión de un campo. */
export function reviewKey(info: TargetInfo, fieldKey: string): string {
	return info.single ? info.target : `${info.target}.${fieldKey}`;
}
