import { normalizeAppearance, type ThemeId } from './themes';

/** Tema que se ve ahora en la web: el principal o el que eligió el visitante. Solo en el navegador. */
export const look = $state<{ current: ThemeId | null }>({ current: null });

const KEY = 'look';

/**
 * Pone el tema en <html>. /theme.js ya lo hace antes de pintar con lo que trae la página; esto
 * lo repite al abrirse y cuando llega el contenido publicado más reciente (por si el tema
 * principal cambió después de generar la web).
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

/** El visitante elige otro tema: se recuerda en este navegador y cambia con un fundido. */
export function chooseLook(id: ThemeId) {
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
