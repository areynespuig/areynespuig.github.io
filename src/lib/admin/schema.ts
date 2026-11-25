import type { CollectionKey, Education, Experience, Project, SiteContent } from '../content/types';

export type SectionId = 'inicio' | 'sobre' | 'educacion' | 'experiencia' | 'proyectos';

export const SECTIONS: { id: SectionId; name: string }[] = [
	{ id: 'inicio', name: 'Portada' },
	{ id: 'sobre', name: 'Sobre mí' },
	{ id: 'educacion', name: 'Educación' },
	{ id: 'experiencia', name: 'Experiencia' },
	{ id: 'proyectos', name: 'Proyectos' }
];

export type FieldDef =
	| { key: string; label: string; type: 'l10n'; long?: boolean }
	| { key: string; label: string; type: 'l10nList'; hint: string }
	| { key: string; label: string; type: 'text' | 'url'; placeholder?: string }
	| { key: string; label: string; type: 'year' }
	| { key: string; label: string; type: 'bool' }
	| { key: string; label: string; type: 'image' | 'pdf'; hint?: string };

export interface TargetInfo {
	target: string;
	title: string;
	section: SectionId;
	fields: FieldDef[];
	/** Objeto del contenido que guarda los campos (se edita directamente). */
	obj: Record<string, any>;
	collection?: CollectionKey;
	id?: string;
	/** Bloque de un único texto: el inspector no repite su etiqueta. */
	single?: boolean;
}

export const COLLECTIONS: Record<
	CollectionKey,
	{ section: SectionId; add: string; fresh: string; fields: FieldDef[] }
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

function single(
	target: string,
	title: string,
	section: SectionId,
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

/** Traduce un identificador de bloque («hero.subtitle», «projects:salutsegura»…) a lo que se puede editar. */
export function resolveTarget(c: SiteContent, target: string): TargetInfo | null {
	switch (target) {
		case 'profile':
			return {
				target,
				title: 'Perfil',
				section: 'inicio',
				obj: c.profile,
				fields: [
					{ key: 'name', label: 'Nombre', type: 'text' },
					{ key: 'photo', label: 'Foto', type: 'image' },
					{ key: 'photoAlt', label: 'Descripción de la foto', type: 'l10n' },
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
	const match = /^(education|experience|projects):(.+)$/.exec(target);
	if (!match) return null;
	const collection = match[1] as CollectionKey;
	const item = (c[collection] as Array<Education | Experience | Project>).find((i) => i.id === match[2]);
	if (!item) return null;
	return {
		target,
		title: itemTitle(collection, item),
		section: COLLECTIONS[collection].section,
		obj: item as unknown as Record<string, any>,
		fields: COLLECTIONS[collection].fields,
		collection,
		id: item.id
	};
}

export function allTargets(c: SiteContent): string[] {
	return [
		'profile',
		'hero.availability',
		'hero.greeting',
		'hero.subtitle',
		'about.bio',
		'about.skills',
		...c.education.map((i) => `education:${i.id}`),
		...c.experience.map((i) => `experience:${i.id}`),
		...c.projects.map((i) => `projects:${i.id}`)
	];
}

/** Clave con la que se guardan los avisos de revisión de un campo. */
export function reviewKey(info: TargetInfo, fieldKey: string): string {
	return info.single ? info.target : `${info.target}.${fieldKey}`;
}
