import {
	BUILTIN_SECTIONS,
	LANGS,
	SECTION_LAYOUTS,
	type BuiltinSection,
	type CustomSection,
	type L10n,
	type SectionItem,
	type SectionLayout,
	type SiteContent
} from './types';

export function isBuiltin(id: string): id is BuiltinSection {
	return (BUILTIN_SECTIONS as readonly string[]).includes(id);
}

/**
 * Orden en que se muestran las secciones bajo la portada. Tolera contenido antiguo sin orden
 * guardado y repara órdenes incompletos: lo que falte va al final y lo que sobre se ignora.
 */
export function sectionOrder(content: SiteContent): string[] {
	const custom = (content.sections ?? []).map((s) => s.id);
	const known = new Set<string>([...BUILTIN_SECTIONS, ...custom]);
	const out: string[] = [];
	for (const id of content.order ?? []) if (known.has(id) && !out.includes(id)) out.push(id);
	for (const id of [...BUILTIN_SECTIONS, ...custom]) if (!out.includes(id)) out.push(id);
	return out;
}

/**
 * Secciones que se ven bajo la portada, en orden: las de la web siempre y las nuevas cuando tienen
 * título y contenido (en el editor, todas). Lo usan el menú de la web y el terminal.
 */
export function shownSections(content: SiteContent, editing = false): string[] {
	const custom = new Map((content.sections ?? []).map((s) => [s.id, s]));
	return sectionOrder(content).filter((id) => {
		if (isBuiltin(id)) return true;
		const s = custom.get(id);
		return !!s && (editing || sectionVisible(s));
	});
}

export function hasText(value: L10n | undefined): boolean {
	return !!value && LANGS.some((l) => value[l]?.trim());
}

/** En la web solo aparecen las secciones con título y algo dentro: así un borrador a medias no se publica vacío. */
export function sectionVisible(section: CustomSection): boolean {
	if (!hasText(section.title)) return false;
	if (hasText(section.body)) return true;
	if (section.layout === 'text') return LANGS.some((l) => section.points[l]?.some((p) => p.trim()));
	return section.items.length > 0;
}

/** Texto con párrafos: una línea en blanco separa párrafos. */
export function paragraphs(text: string): string[] {
	return text
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
}

const empty = (): L10n => ({ es: '', ca: '', en: '' });

export function newSection(id: string, layout: SectionLayout): CustomSection {
	return {
		id,
		layout: SECTION_LAYOUTS.includes(layout) ? layout : 'text',
		title: empty(),
		body: empty(),
		points: { es: [], ca: [], en: [] },
		items: []
	};
}

export function newSectionItem(id: string): SectionItem {
	return {
		id,
		title: empty(),
		subtitle: empty(),
		description: empty(),
		start: null,
		end: null,
		ongoing: false,
		image: '',
		imageAlt: empty(),
		url: ''
	};
}

/** Nombre y explicación de cada tipo de sección, tal como se ven en el editor. */
export const LAYOUT_INFO: Record<SectionLayout, { label: string; hint: string }> = {
	text: { label: 'Texto', hint: 'Párrafos y, si quieres, una lista de puntos. Como «Sobre mí».' },
	list: { label: 'Lista con fechas', hint: 'Entradas con años, título y descripción. Como «Experiencia»: cursos, certificados, premios…' },
	cards: { label: 'Tarjetas', hint: 'Tarjetas con imagen, descripción y enlace. Como «Proyectos».' }
};
