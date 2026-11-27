import { lookInfo, normalizeAppearance, type Appearance, type LookInfo } from './appearance';

/** Plantilla que se ve ahora en la web: la principal o la que eligió el visitante. Solo en el navegador. */
export const look = $state<{ current: string | null }>({ current: null });

const KEY = 'look';

/** Subconjunto latino de las fuentes (el que usa la web); los navegadores lo escriben como U+0-FF o U+0000-00FF. */
const LATIN = /(^|,)\s*U\+0+-0*FF\s*(,|$)/i;

type StoredAppearance = Parameters<typeof normalizeAppearance>[0];

/** Descarga la letra de una plantilla; si tarda más de 1,5 s, no la espera. */
function fontsReady(families: string[]): Promise<unknown> {
	const loads: Promise<unknown>[] = [];
	document.fonts.forEach((face) => {
		if (families.includes(face.family.replace(/["']/g, '')) && LATIN.test(face.unicodeRange)) {
			loads.push(face.load().catch(() => {}));
		}
	});
	return Promise.race([Promise.all(loads), new Promise((done) => setTimeout(done, 1500))]);
}

/** En <html>: la plantilla de la web en la que se basa y, si es propia, su id (sus variables CSS). */
function setRoot(info: LookInfo) {
	const root = document.documentElement;
	root.dataset.look = info.base;
	if (info.template) root.dataset.tpl = info.id;
	else delete root.dataset.tpl;
	look.current = info.id;
}

function current(appearance: Appearance): string {
	let pick: string | null = null;
	try {
		pick = localStorage.getItem(KEY);
	} catch {
		/* sin almacenamiento: la principal */
	}
	return pick && appearance.choices.includes(pick) ? pick : appearance.theme;
}

/** Pone la plantilla en <html>. /theme.js ya lo hace antes de pintar con lo que trae la página; esto lo repite al abrirse la app. */
export function syncLook(stored: StoredAppearance) {
	const appearance = normalizeAppearance(stored);
	setRoot(lookInfo(appearance, current(appearance)));
}

/**
 * El visitante elige otra plantilla: se recuerda en este navegador y cambia con un fundido, ya con
 * su letra cargada (si no, el texto desaparecería un momento mientras llega).
 */
export async function chooseLook(id: string, stored: StoredAppearance) {
	const info = lookInfo(normalizeAppearance(stored), id);
	await fontsReady(info.fonts);
	const apply = () => {
		setRoot(info);
		try {
			localStorage.setItem(KEY, id);
		} catch {
			/* sin almacenamiento: el cambio dura hasta recargar */
		}
	};
	const still =
		matchMedia('(prefers-reduced-motion: reduce)').matches ||
		info.base === 'contraste' ||
		document.documentElement.dataset.look === 'contraste';
	if (!document.startViewTransition || still) apply();
	else document.startViewTransition(apply);
}
