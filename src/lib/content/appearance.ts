import { THEME_IDS, THEMES, isThemeId, type ThemeId } from './themes';
import { COLORS, normalizeTemplates, type ColorKey, type TemplateDef } from './templates';
import type { Lang } from './types';

/**
 * Apariencia de la web: la plantilla principal (de la web o propia), las que pueden elegir los
 * visitantes y las plantillas propias.
 */
export interface Appearance {
	theme: string;
	choices: string[];
	templates: TemplateDef[];
}

/** La apariencia guardada, reparada: plantillas que existen, sin repetir y con la principal entre las elegibles. */
export function normalizeAppearance(
	value: { theme?: unknown; choices?: unknown; templates?: unknown } | undefined
): Appearance {
	const templates = normalizeTemplates(value?.templates);
	// Primero las propias, como en el editor.
	const ids: string[] = [...templates.map((t) => t.id), ...THEME_IDS];
	const theme = typeof value?.theme === 'string' && ids.includes(value.theme) ? value.theme : 'pino';
	const listed = Array.isArray(value?.choices) ? value.choices : [];
	const choices = ids.filter((id) => id === theme || listed.includes(id));
	return { theme, choices, templates };
}

/** Todo lo que hace falta para mostrar una plantilla, sea de la web o propia. */
export interface LookInfo {
	id: string;
	/** Plantilla de la web en la que se basa (ella misma, si es de la web). */
	base: ThemeId;
	template: TemplateDef | null;
	name: (lang: Lang) => string;
	hint: string;
	swatches: [string, string, string];
	schemes: readonly ('light' | 'dark')[];
	/** Familias de letra que usa: /theme.js y el selector las cargan antes de enseñarla. */
	fonts: string[];
}

export function lookInfo(appearance: Appearance, id: string): LookInfo {
	const template = appearance.templates.find((t) => t.id === id) ?? null;
	const base: ThemeId = template ? template.base : isThemeId(id) ? id : 'pino';
	const theme = THEMES[base];
	if (!template) {
		return {
			id: base,
			base,
			template: null,
			name: (lang) => theme.name[lang],
			hint: theme.hint,
			swatches: theme.swatches,
			schemes: theme.schemes,
			fonts: [...new Set(Object.values(theme.type))]
		};
	}
	const font = (key: string, fallback: string) => {
		const v = template.values[key];
		return typeof v === 'string' ? v : fallback;
	};
	const color = (key: ColorKey, fallback: string) => template.colors[key]?.light ?? template.colors[key]?.dark ?? fallback;
	return {
		id: template.id,
		base,
		template,
		name: () => template.name,
		hint: `A partir de ${theme.name.es}`,
		swatches: [color('paper', theme.swatches[0]), color('accent', theme.swatches[1]), color('ink', theme.swatches[2])],
		schemes: theme.schemes,
		fonts: [
			...new Set([
				font('fontText', theme.type.text),
				font('fontDisplay', theme.type.display),
				font('fontUi', theme.type.ui)
			])
		]
	};
}

/** ¿Se ha cambiado algo de esta plantilla propia? */
export function isTouched(template: TemplateDef): boolean {
	return Object.keys(template.values).length > 0 || COLORS.some(({ key }) => template.colors[key]);
}
