import type { L10n } from './types';

/**
 * Temas de la web. Cada uno cambia colores, tipografías, formas y algunos detalles propios
 * (en `themes.css`); la estructura y el contenido son los mismos.
 */
export const THEME_IDS = ['pino', 'cobalto', 'terminal', 'suizo', 'bruto', 'riso', 'bauhaus', 'contraste', 'medianoche'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeInfo {
	name: L10n;
	/** Una línea para el editor: qué carácter tiene. */
	hint: string;
	/** Fondo, acento y tinta, para la muestra de color. */
	swatches: [string, string, string];
	/** Versiones que tiene: los temas de una sola no muestran el botón de claro/oscuro. */
	schemes: readonly ('light' | 'dark')[];
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
	pino: {
		name: { es: 'Pino y porcelana', ca: 'Pi i porcellana', en: 'Pine and porcelain' },
		hint: 'Claro y sereno: porcelana, tinta verdinegra y acento pino. Albert Sans.',
		swatches: ['#fafbfa', '#1e5b48', '#12201b'],
		schemes: ['light', 'dark']
	},
	cobalto: {
		name: { es: 'Cobalto', ca: 'Cobalt', en: 'Cobalt' },
		hint: 'Portada con franja azul intenso y el nombre en mayúsculas condensadas.',
		swatches: ['#f5f6f4', '#2346e8', '#111316'],
		schemes: ['light', 'dark']
	},
	terminal: {
		name: { es: 'Terminal', ca: 'Terminal', en: 'Terminal' },
		hint: 'Oscuro, de desarrollador: letra monoespaciada en ámbar y cursor que parpadea.',
		swatches: ['#12100c', '#ffb000', '#f2e8d5'],
		schemes: ['dark']
	},
	suizo: {
		name: { es: 'Suizo', ca: 'Suís', en: 'Swiss' },
		hint: 'Tipografía suiza: blanco, negro y un solo rojo, sin esquinas redondeadas.',
		swatches: ['#ffffff', '#e10600', '#000000'],
		schemes: ['light']
	},
	bruto: {
		name: { es: 'Bruto', ca: 'Brut', en: 'Brutal' },
		hint: 'Neobrutalista: bordes negros gruesos, sombras duras, amarillo y azul.',
		swatches: ['#f2f2ee', '#ffd400', '#2b59ff'],
		schemes: ['light']
	},
	riso: {
		name: { es: 'Riso', ca: 'Riso', en: 'Riso' },
		hint: 'Como una impresión a dos tintas, rosa y azul, con las capas desplazadas.',
		swatches: ['#f7f5f2', '#ff4fa0', '#2d5bd6'],
		schemes: ['light']
	},
	bauhaus: {
		name: { es: 'Bauhaus', ca: 'Bauhaus', en: 'Bauhaus' },
		hint: 'Círculo, cuadrado y triángulo en rojo, amarillo y azul; letra geométrica.',
		swatches: ['#f4f3ee', '#d62828', '#1d4e89'],
		schemes: ['light']
	},
	contraste: {
		name: { es: 'Alto contraste', ca: 'Alt contrast', en: 'High contrast' },
		hint: 'Pensado para leer bien: negro y blanco, letra grande, sin animaciones.',
		swatches: ['#ffffff', '#ffe500', '#000000'],
		schemes: ['light', 'dark']
	},
	medianoche: {
		name: { es: 'Medianoche', ca: 'Mitjanit', en: 'Midnight' },
		hint: 'Oscuro y elegante: azul noche, serif fina con cursiva y detalles dorados.',
		swatches: ['#0e1424', '#e2b65b', '#ece7dd'],
		schemes: ['dark']
	}
};

export function isThemeId(value: unknown): value is ThemeId {
	return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/** Qué tema se ve por defecto y entre cuáles pueden elegir los visitantes. */
export interface Appearance {
	theme: ThemeId;
	choices: ThemeId[];
}

/** La apariencia guardada, reparada: temas que existen, sin repetir y con el principal entre los elegibles. */
export function normalizeAppearance(value: { theme?: unknown; choices?: unknown } | undefined): Appearance {
	const theme = isThemeId(value?.theme) ? value.theme : 'pino';
	const listed = Array.isArray(value?.choices) ? value.choices.filter(isThemeId) : [];
	const choices = THEME_IDS.filter((id) => id === theme || listed.includes(id));
	return { theme, choices };
}
