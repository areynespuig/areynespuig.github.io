import { THEMES, normalizeAppearance, type ThemeId } from './themes';

/** Tema que se ve ahora en la web: el principal o el que eligió el visitante. Solo en el navegador. */
export const look = $state<{ current: ThemeId | null }>({ current: null });

const KEY = 'look';

/** Subconjunto latino de las fuentes (el que usa la web); los navegadores lo escriben como U+0-FF o U+0000-00FF. */
const LATIN = /(^|,)\s*U\+0+-0*FF\s*(,|$)/i;

/** Descarga la letra de un tema; si tarda más de 1,5 s, no la espera. */
function fontsReady(id: ThemeId): Promise<unknown> {
	const families = THEMES[id].fonts;
	const loads: Promise<unknown>[] = [];
	document.fonts.forEach((face) => {
		if (families.includes(face.family.replace(/["']/g, '')) && LATIN.test(face.unicodeRange)) {
			loads.push(face.load().catch(() => {}));
		}
	});
	return Promise.race([Promise.all(loads), new Promise((done) => setTimeout(done, 1500))]);
}

/**
 * Pone el tema en <html>. /theme.js ya lo hace antes de pintar con lo que trae la página; esto
 * lo repite al abrirse la app.
 */
export function syncLook(appearance: { theme?: unknown; choices?: unknown } | undefined) {
	const { theme, choices } = normalizeAppearance(appearance);
	let pick: string | null = null;
	try {
		pick = localStorage.getItem(KEY);
	} catch {
		/* sin almacenamiento: el tema principal */
	}
	const current = pick && (choices as string[]).includes(pick) ? (pick as ThemeId) : theme;
	document.documentElement.dataset.look = current;
	look.current = current;
}

/**
 * El visitante elige otro tema: se recuerda en este navegador y cambia con un fundido, ya con su
 * letra cargada (si no, el texto desaparecería un momento mientras llega).
 */
export async function chooseLook(id: ThemeId) {
	await fontsReady(id);
	const apply = () => {
		document.documentElement.dataset.look = id;
		look.current = id;
		try {
			localStorage.setItem(KEY, id);
		} catch {
			/* sin almacenamiento: el cambio dura hasta recargar */
		}
	};
	const still =
		matchMedia('(prefers-reduced-motion: reduce)').matches || id === 'contraste' || look.current === 'contraste';
	if (!document.startViewTransition || still) apply();
	else document.startViewTransition(apply);
}
