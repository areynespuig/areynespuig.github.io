import type { L10n, L10nList, Lang } from './content/types';

export const LANG_NAMES: Record<Lang, string> = {
	es: 'Castellano',
	ca: 'Català',
	en: 'English'
};

export const LANG_PATHS: Record<Lang, string> = {
	es: '/',
	ca: '/ca/',
	en: '/en/'
};

/** Textos fijos de la interfaz de la web (no se editan desde el CMS). */
export const UI = {
	es: {
		title: 'Albert Reynés Puig | Portafolio',
		description: 'Portafolio de Albert Reynés Puig: estudios, experiencia y proyectos.',
		skip: 'Saltar al contenido',
		nav: { about: 'Sobre mí', education: 'Educación', experience: 'Experiencia', projects: 'Proyectos' },
		navLabel: 'Secciones',
		langLabel: 'Idioma de la web',
		cv: 'Descargar currículum',
		skills: 'Competencias clave',
		present: 'actualidad',
		viewProject: 'Ver proyecto',
		more: 'Ver más',
		howItWorks: 'Cómo funciona',
		backToProjects: 'Volver a los proyectos',
		step: 'Paso',
		notFoundTitle: 'Esta página no existe',
		notFoundText: 'Puede que la dirección esté mal escrita o que la página se haya quitado.',
		goHome: 'Ir a la portada',
		newTab: '(se abre en una pestaña nueva)',
		themeToDark: 'Cambiar a tema oscuro',
		themeToLight: 'Cambiar a tema claro',
		themeLabel: 'Tema de la web',
		made: 'Hecho con SvelteKit.',
		missing: 'Falta en castellano'
	},
	ca: {
		title: 'Albert Reynés Puig | Portafoli',
		description: "Portafoli de l'Albert Reynés Puig: estudis, experiència i projectes.",
		skip: 'Salta al contingut',
		nav: { about: 'Sobre mi', education: 'Educació', experience: 'Experiència', projects: 'Projectes' },
		navLabel: 'Seccions',
		langLabel: 'Idioma del web',
		cv: 'Descarregar currículum',
		skills: 'Competències clau',
		present: 'actualitat',
		viewProject: 'Veure projecte',
		more: 'Veure més',
		howItWorks: 'Com funciona',
		backToProjects: 'Tornar als projectes',
		step: 'Pas',
		notFoundTitle: 'Aquesta pàgina no existeix',
		notFoundText: "Potser l'adreça està mal escrita o la pàgina s'ha tret.",
		goHome: 'Anar a la portada',
		newTab: "(s'obre en una pestanya nova)",
		themeToDark: 'Canviar a tema fosc',
		themeToLight: 'Canviar a tema clar',
		themeLabel: 'Tema del web',
		made: 'Fet amb SvelteKit.',
		missing: 'Falta en català'
	},
	en: {
		title: 'Albert Reynés Puig | Portfolio',
		description: "Albert Reynés Puig's portfolio: education, experience and projects.",
		skip: 'Skip to content',
		nav: { about: 'About', education: 'Education', experience: 'Experience', projects: 'Projects' },
		navLabel: 'Sections',
		langLabel: 'Site language',
		cv: 'Download résumé',
		skills: 'Key skills',
		present: 'present',
		viewProject: 'View project',
		more: 'Learn more',
		howItWorks: 'How it works',
		backToProjects: 'Back to projects',
		step: 'Step',
		notFoundTitle: 'This page does not exist',
		notFoundText: 'The address may be mistyped, or the page may have been removed.',
		goHome: 'Go to the home page',
		newTab: '(opens in a new tab)',
		themeToDark: 'Switch to dark theme',
		themeToLight: 'Switch to light theme',
		themeLabel: 'Site theme',
		made: 'Built with SvelteKit.',
		missing: 'Missing in English'
	}
} satisfies Record<Lang, unknown>;

/** Idioma de una dirección de la web: /ca/… es catalán, /en/… inglés y el resto castellano. */
export function langFromPath(path: string): Lang {
	if (path === '/ca' || path.startsWith('/ca/')) return 'ca';
	if (path === '/en' || path.startsWith('/en/')) return 'en';
	return 'es';
}

const FALLBACK: Lang[] = ['es', 'ca', 'en'];

/** Texto en el idioma pedido; si falta, el primero disponible. */
export function pick(value: L10n, lang: Lang): string {
	if (value[lang]?.trim()) return value[lang];
	for (const l of FALLBACK) if (value[l]?.trim()) return value[l];
	return '';
}

export function pickList(value: L10nList, lang: Lang): string[] {
	const clean = (l: Lang) => (value[l] ?? []).filter((s) => s.trim() !== '');
	if (clean(lang).length) return clean(lang);
	for (const l of FALLBACK) if (clean(l).length) return clean(l);
	return [];
}
