import type { L10n, Lang, PageBlock, Project, ProjectPage, SiteContent } from './types';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Convierte un texto en una dirección válida: «Mi Proyecto Ñ» → «mi-proyecto-n». */
export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/, '');
}

export function isValidSlug(slug: string | undefined): slug is string {
	return !!slug && SLUG.test(slug);
}

/** El proyecto con página publicada en esa dirección. */
export function findPageProject(content: SiteContent, slug: string): (Project & { page: ProjectPage }) | undefined {
	return content.projects.find((p): p is Project & { page: ProjectPage } => !!p.page && p.page.slug === slug);
}

/** Dirección de la página de un proyecto en cada idioma. */
export function projectPath(lang: Lang, slug: string): string {
	return { es: `/proyectos/${slug}/`, ca: `/ca/projectes/${slug}/`, en: `/en/projects/${slug}/` }[lang];
}

/** Una dirección libre a partir del nombre del proyecto, sin repetir la de otro. */
export function uniqueSlug(content: SiteContent, wanted: string, ownId?: string): string {
	const taken = new Set(content.projects.filter((p) => p.id !== ownId && p.page).map((p) => p.page!.slug));
	const base = slugify(wanted) || 'proyecto';
	let slug = base;
	for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
	return slug;
}

const empty = (): L10n => ({ es: '', ca: '', en: '' });

export function newProjectPage(slug: string): ProjectPage {
	return { slug, intro: empty(), steps: true, blocks: [] };
}

export function newPageBlock(id: string): PageBlock {
	return { id, title: empty(), body: empty(), image: '', imageAlt: empty() };
}
