import { LANGS, type BuiltinSection, type Lang, type SiteContent } from './types';
import { isBuiltin, shownSections } from './sections';
import { UI, pick } from '../i18n';

/**
 * La web como sistema de archivos, para el terminal: cada sección visible es una carpeta y, dentro
 * de «proyectos», cada proyecto con página es una subcarpeta (sin página, un archivo). Sale del
 * contenido, así que una sección nueva aparece sola en cuanto se ve en la web.
 */
export interface SiteNode {
	/** Nombre en el idioma de la página: «sobre_mi», «portfolio_cms». */
	name: string;
	/** Otros nombres que también valen al escribir (los de los otros idiomas, el id, la dirección…). */
	aliases: string[];
	title: string;
	kind: 'section' | 'project';
	/** Sección: id del elemento al que se desplaza la página. */
	anchor?: string;
	/** Proyecto: dirección de su página, si tiene. */
	slug?: string;
	/** Proyecto: enlace externo. */
	url?: string;
	children: SiteNode[];
}

const BUILTIN_NAV: Record<BuiltinSection, keyof (typeof UI)['es']['nav']> = {
	sobre: 'about',
	educacion: 'education',
	experiencia: 'experience',
	proyectos: 'projects'
};

/** Nombre de carpeta: «Sobre mí» → «sobre_mi», «Salutsegura.cat» → «salutsegura_cat». */
export function folderName(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

/** Sin repetir nombres en una misma carpeta: el segundo «notas» pasa a «notas_2». */
function unique(name: string, taken: Set<string>): string {
	let out = name || 'sin_nombre';
	for (let n = 2; taken.has(out); n++) out = `${name}_${n}`;
	taken.add(out);
	return out;
}

export function siteTree(content: SiteContent, lang: Lang): SiteNode[] {
	const custom = new Map((content.sections ?? []).map((s) => [s.id, s]));
	const taken = new Set<string>();
	return shownSections(content).map((id) => {
		const titles = LANGS.map((l) => (isBuiltin(id) ? UI[l].nav[BUILTIN_NAV[id]] : pick(custom.get(id)!.title, l)));
		const title = titles[LANGS.indexOf(lang)];
		const node: SiteNode = {
			name: unique(folderName(title), taken),
			aliases: [...titles.map(folderName), folderName(id)],
			title,
			kind: 'section',
			anchor: id,
			children: []
		};
		if (id === 'proyectos') {
			const inside = new Set<string>();
			node.children = content.projects
				.filter((p) => p.title.trim())
				.map((p) => ({
					name: unique(folderName(p.title), inside),
					aliases: [folderName(p.title), ...(p.page ? [folderName(p.page.slug)] : [])],
					title: p.title,
					kind: 'project' as const,
					slug: p.page?.slug,
					url: p.url || undefined,
					children: []
				}));
		}
		return node;
	});
}
