import { isThemeId, type ThemeId } from './themes';

/**
 * Plantillas propias: una copia de una plantilla de la web (`base`) con lo que se ha cambiado
 * (tamaños, posiciones, colores, letra y bordes). Solo se guarda lo cambiado; el resto sigue como
 * en la original, así que también conserva sus detalles propios (el cursor de Terminal, las formas
 * de Bauhaus…).
 *
 * Cada opción se convierte en variables CSS que usan la portada y las páginas de proyecto. Todo lo
 * que llega al CSS sale de listas cerradas o de números acotados (ver `normalizeTemplates`), así
 * que el contenido guardado no puede colar CSS propio.
 */

/** Letras que pueden usar las plantillas: las de las plantillas de la web, que ya vienen incluidas. */
export const FONTS = [
	{ family: 'Albert Sans Variable', label: 'Albert Sans', kind: 'sans' },
	{ family: 'Archivo Variable', label: 'Archivo', kind: 'sans' },
	{ family: 'Atkinson Hyperlegible Next Variable', label: 'Atkinson Hyperlegible', kind: 'sans' },
	{ family: 'Bricolage Grotesque Variable', label: 'Bricolage Grotesque', kind: 'sans' },
	{ family: 'Fraunces Variable', label: 'Fraunces (con remates)', kind: 'serif' },
	{ family: 'IBM Plex Sans Variable', label: 'IBM Plex Sans', kind: 'sans' },
	{ family: 'Instrument Sans Variable', label: 'Instrument Sans', kind: 'sans' },
	{ family: 'JetBrains Mono Variable', label: 'JetBrains Mono (monoespaciada)', kind: 'mono' },
	{ family: 'Jost Variable', label: 'Jost', kind: 'sans' },
	{ family: 'Karla Variable', label: 'Karla', kind: 'sans' },
	{ family: 'Syne Variable', label: 'Syne', kind: 'sans' },
	{ family: 'Unbounded Variable', label: 'Unbounded', kind: 'sans' },
	{ family: 'Work Sans Variable', label: 'Work Sans', kind: 'sans' }
] as const;

const FALLBACK = { sans: 'system-ui, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace' };

function fontStack(family: string): string {
	const font = FONTS.find((f) => f.family === family);
	return `'${family}', ${FALLBACK[font?.kind ?? 'sans']}`;
}

/** Grupos de opciones del panel. Al hacer clic en la vista previa se abre el de esa parte. */
export type GroupId = 'hero' | 'sections' | 'cards' | 'page' | 'colors' | 'type' | 'shape';

export const GROUPS: { id: GroupId; label: string }[] = [
	{ id: 'hero', label: 'Portada' },
	{ id: 'sections', label: 'Secciones' },
	{ id: 'cards', label: 'Tarjetas' },
	{ id: 'page', label: 'Página' },
	{ id: 'colors', label: 'Colores' },
	{ id: 'type', label: 'Letra' },
	{ id: 'shape', label: 'Bordes' }
];

/** Qué grupo corresponde a lo que se ha pulsado en la vista previa. */
export function groupForTarget(target: string): GroupId | null {
	if (target === 'profile' || target === 'photo' || target.startsWith('hero.')) return 'hero';
	if (target.startsWith('projects:')) return 'cards';
	if (/^(about\.|section:|education:|experience:|page:)/.test(target)) return 'sections';
	return null;
}

export interface RangeControl {
	kind: 'range';
	key: string;
	group: GroupId;
	label: string;
	min: number;
	max: number;
	step: number;
	unit: '%' | 'px' | 'rem' | '';
	/** Valor de la plantilla original, si es el mismo en todas. */
	base?: number;
	/** Si no, la variable CSS de la que se lee lo que se ve ahora. */
	reads?: string;
	css: (value: number) => string;
}

export interface ChoiceControl {
	kind: 'choice';
	key: string;
	group: GroupId;
	label: string;
	/** La primera es la de la plantilla original (o «Original», si depende de cada una: valor vacío). */
	options: { value: string; label: string }[];
	css: (value: string) => string;
}

export interface FontControl {
	kind: 'font';
	key: string;
	group: GroupId;
	label: string;
	reads: string;
	css: (family: string) => string;
}

export type Control = RangeControl | ChoiceControl | FontControl;

const scale = (name: string) => (v: number) => `--${name}:${v / 100}`;

export const CONTROLS: Control[] = [
	// Portada
	{ kind: 'range', key: 'nameScale', group: 'hero', label: 'Tamaño del nombre', min: 50, max: 150, step: 5, unit: '%', base: 100, css: scale('name-scale') },
	{ kind: 'range', key: 'leadScale', group: 'hero', label: 'Tamaño del subtítulo', min: 70, max: 150, step: 5, unit: '%', base: 100, css: scale('lead-scale') },
	{ kind: 'range', key: 'photoScale', group: 'hero', label: 'Tamaño de la foto', min: 50, max: 170, step: 5, unit: '%', base: 100, css: scale('photo-scale') },
	{
		kind: 'choice',
		key: 'photo',
		group: 'hero',
		label: 'Posición de la foto',
		options: [
			{ value: 'right', label: 'Derecha' },
			{ value: 'left', label: 'Izquierda' },
			{ value: 'top', label: 'Encima' },
			{ value: 'none', label: 'Sin foto' }
		],
		css: (v) =>
			({
				right: '--hero-cols:minmax(0,1fr) auto;--photo-order:0;--photo-display:block',
				left: '--hero-cols:auto minmax(0,1fr);--photo-order:-1;--photo-display:block',
				top: '--hero-cols:minmax(0,1fr);--photo-order:-1;--photo-display:block',
				none: '--hero-cols:minmax(0,1fr);--photo-display:none'
			})[v] ?? ''
	},
	{
		kind: 'choice',
		key: 'photoAlign',
		group: 'hero',
		label: 'Altura de la foto junto al texto',
		options: [
			{ value: 'end', label: 'Abajo' },
			{ value: 'center', label: 'En medio' },
			{ value: 'start', label: 'Arriba' }
		],
		css: (v) => `--hero-valign:${v}`
	},
	{
		kind: 'choice',
		key: 'heroAlign',
		group: 'hero',
		label: 'Alineación del texto',
		options: [
			{ value: 'start', label: 'Izquierda' },
			{ value: 'center', label: 'Centrado' }
		],
		css: (v) =>
			v === 'center'
				? '--hero-items:center;--hero-text:center;--photo-justify:center'
				: '--hero-items:flex-start;--hero-text:start;--photo-justify:normal'
	},
	{
		kind: 'choice',
		key: 'buttons',
		group: 'hero',
		label: 'Tamaño de los botones',
		options: [
			{ value: 'm', label: 'Normales' },
			{ value: 's', label: 'Pequeños' },
			{ value: 'l', label: 'Grandes' }
		],
		css: (v) =>
			({
				s: '--btn-h:40px;--btn-px:1rem;--btn-fs:0.875rem',
				m: '--btn-h:48px;--btn-px:1.35rem;--btn-fs:0.975rem',
				l: '--btn-h:58px;--btn-px:1.75rem;--btn-fs:1.1rem'
			})[v] ?? ''
	},

	// Secciones
	{
		kind: 'choice',
		key: 'heads',
		group: 'sections',
		label: 'Título de cada sección',
		options: [
			{ value: 'side', label: 'Al lado' },
			{ value: 'top', label: 'Encima' }
		],
		css: (v) =>
			v === 'top'
				? '--block-cols:minmax(0,1fr);--head-pos:static;--head-fit:100cqi'
				: '--block-cols:var(--head-w,17rem) minmax(0,1fr);--head-pos:sticky;--head-fit:var(--head-w,17rem)'
	},
	{ kind: 'range', key: 'headWidth', group: 'sections', label: 'Ancho de la columna del título', min: 10, max: 26, step: 1, unit: 'rem', base: 17, css: (v) => `--head-w:${v}rem` },
	{ kind: 'range', key: 'h2Scale', group: 'sections', label: 'Tamaño de los títulos', min: 60, max: 150, step: 5, unit: '%', base: 100, css: scale('h2-scale') },
	{ kind: 'range', key: 'textScale', group: 'sections', label: 'Tamaño del texto', min: 85, max: 130, step: 5, unit: '%', base: 100, css: scale('text-scale') },

	// Tarjetas
	{
		kind: 'choice',
		key: 'cards',
		group: 'cards',
		label: 'Tarjetas por fila',
		options: [
			{ value: 'auto', label: 'Según el ancho' },
			{ value: '1', label: 'Una' },
			{ value: '2', label: 'Dos' },
			{ value: '3', label: 'Tres' }
		],
		// En pantallas estrechas siempre caben menos: ninguna tarjeta baja de 15rem.
		css: (v) =>
			({
				auto: '--cards-min:19rem',
				'1': '--cards-min:100%',
				'2': '--cards-min:max(15rem, calc((100% - 1.25rem) / 2 - 1px))',
				'3': '--cards-min:max(15rem, calc((100% - 2.5rem) / 3 - 1px))'
			})[v] ?? ''
	},
	{
		kind: 'choice',
		key: 'ratio',
		group: 'cards',
		label: 'Proporción de la imagen',
		options: [
			{ value: '16/9', label: '16:9' },
			{ value: '3/2', label: '3:2' },
			{ value: '4/3', label: '4:3' },
			{ value: '1/1', label: 'Cuadrada' }
		],
		css: (v) => `--card-ratio:${v.replace('/', ' / ')}`
	},

	// Página
	{ kind: 'range', key: 'pageWidth', group: 'page', label: 'Ancho máximo del contenido', min: 56, max: 100, step: 2, unit: 'rem', base: 76, css: (v) => `--page-max:${v}rem` },
	{ kind: 'range', key: 'space', group: 'page', label: 'Espacio entre secciones', min: 40, max: 160, step: 10, unit: '%', base: 100, css: scale('space') },

	// Letra
	{ kind: 'font', key: 'fontDisplay', group: 'type', label: 'Letra de los títulos', reads: '--font-display', css: (f) => `--font-display:${fontStack(f)}` },
	{ kind: 'font', key: 'fontText', group: 'type', label: 'Letra del texto', reads: '--font', css: (f) => `--font:${fontStack(f)}` },
	{ kind: 'font', key: 'fontUi', group: 'type', label: 'Letra de botones y menús', reads: '--font-ui', css: (f) => `--font-ui:${fontStack(f)}` },
	{ kind: 'range', key: 'titleWeight', group: 'type', label: 'Grosor de los títulos', min: 300, max: 900, step: 10, unit: '', reads: '--name-weight', css: (v) => `--name-weight:${v};--h2-weight:${v}` },
	{
		kind: 'choice',
		key: 'titleCase',
		group: 'type',
		label: 'Mayúsculas en los títulos',
		options: [
			{ value: '', label: 'Original' },
			{ value: 'none', label: 'Normal' },
			{ value: 'uppercase', label: 'MAYÚSCULAS' },
			{ value: 'lowercase', label: 'minúsculas' }
		],
		css: (v) => `--name-case:${v};--h2-case:${v}`
	},

	// Bordes
	{ kind: 'range', key: 'radiusCard', group: 'shape', label: 'Esquinas de las tarjetas', min: 0, max: 40, step: 1, unit: 'px', reads: '--radius-card', css: (v) => `--radius-card:${v}px` },
	{ kind: 'range', key: 'radiusPhoto', group: 'shape', label: 'Esquinas de la foto', min: 0, max: 60, step: 1, unit: 'px', reads: '--radius-photo', css: (v) => `--radius-photo:${v}px` },
	// Con 30 px o más, los botones quedan del todo redondos.
	{ kind: 'range', key: 'radiusBtn', group: 'shape', label: 'Esquinas de los botones', min: 0, max: 30, step: 1, unit: 'px', reads: '--radius-btn', css: (v) => `--radius-btn:${v >= 30 ? '999px' : `${v}px`}` },
	{ kind: 'range', key: 'border', group: 'shape', label: 'Grosor de los bordes', min: 0, max: 4, step: 0.5, unit: 'px', reads: '--bw', css: (v) => `--bw:${v}px` },
	{
		kind: 'choice',
		key: 'shadow',
		group: 'shape',
		label: 'Sombras',
		options: [
			{ value: '', label: 'Original' },
			{ value: 'none', label: 'Sin sombra' },
			{ value: 'soft', label: 'Suave' },
			{ value: 'hard', label: 'Marcada' }
		],
		css: (v) =>
			({
				none: '--shadow:none',
				soft: '--shadow:0 14px 34px -18px rgb(0 0 0 / 0.45)',
				hard: '--shadow:5px 5px 0 var(--ink)'
			})[v] ?? ''
	}
];

/** Colores que se pueden cambiar: los de la base de todas las plantillas. */
export const COLORS = [
	{ key: 'paper', label: 'Fondo' },
	{ key: 'surface', label: 'Tarjetas y recuadros' },
	{ key: 'ink', label: 'Texto' },
	{ key: 'muted', label: 'Texto secundario' },
	{ key: 'line', label: 'Líneas y bordes' },
	{ key: 'accent', label: 'Acento: botón principal y enlaces' },
	{ key: 'accent-ink', label: 'Texto sobre el acento' }
] as const;

export type ColorKey = (typeof COLORS)[number]['key'];

/** Un color en el modo claro y en el oscuro (en las plantillas de un solo modo, solo ese). */
export interface SchemeColor {
	light?: string;
	dark?: string;
}

export interface TemplateDef {
	/** `tpl-` y letras y números al azar. */
	id: string;
	name: string;
	/** Plantilla de la web de la que es copia. */
	base: ThemeId;
	/** Opciones cambiadas (clave de CONTROLS → valor). */
	values: Record<string, number | string>;
	colors: Partial<Record<ColorKey, SchemeColor>>;
}

const ID = /^tpl-[a-z0-9]{4,16}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const MAX_TEMPLATES = 24;
export const NAME_MAX = 40;
export const UNNAMED = 'Plantilla sin nombre';

export function newTemplateId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(8));
	return `tpl-${Array.from(bytes, (b) => (b % 36).toString(36)).join('')}`;
}

/** «Bruto - copia», o «Bruto - copia 2» si ya existe. */
export function copyName(name: string, taken: string[]): string {
	const stem = `${name} - copia`.slice(0, NAME_MAX);
	if (!taken.includes(stem)) return stem;
	for (let n = 2; ; n++) {
		const next = `${stem.slice(0, NAME_MAX - String(n).length - 1)} ${n}`;
		if (!taken.includes(next)) return next;
	}
}

export function cleanName(value: unknown): string {
	const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '';
	return name || UNNAMED;
}

function cleanValues(value: unknown): TemplateDef['values'] {
	const out: TemplateDef['values'] = {};
	if (!value || typeof value !== 'object') return out;
	const raw = value as Record<string, unknown>;
	for (const control of CONTROLS) {
		const v = raw[control.key];
		if (control.kind === 'range') {
			if (typeof v === 'number' && Number.isFinite(v)) out[control.key] = Math.min(control.max, Math.max(control.min, v));
		} else if (control.kind === 'choice') {
			if (typeof v === 'string' && v && control.options.some((o) => o.value === v)) out[control.key] = v;
		} else if (typeof v === 'string' && FONTS.some((f) => f.family === v)) {
			out[control.key] = v;
		}
	}
	return out;
}

function cleanColors(value: unknown): TemplateDef['colors'] {
	const out: TemplateDef['colors'] = {};
	if (!value || typeof value !== 'object') return out;
	const raw = value as Record<string, unknown>;
	for (const { key } of COLORS) {
		const c = raw[key];
		if (!c || typeof c !== 'object') continue;
		const { light, dark } = c as Record<string, unknown>;
		const color: SchemeColor = {};
		if (typeof light === 'string' && HEX.test(light)) color.light = light.toLowerCase();
		if (typeof dark === 'string' && HEX.test(dark)) color.dark = dark.toLowerCase();
		if (color.light || color.dark) out[key] = color;
	}
	return out;
}

/** Las plantillas guardadas, reparadas: ids válidos y sin repetir, y solo opciones y valores conocidos. */
export function normalizeTemplates(value: unknown): TemplateDef[] {
	if (!Array.isArray(value)) return [];
	const out: TemplateDef[] = [];
	const seen = new Set<string>();
	for (const item of value) {
		if (!item || typeof item !== 'object') continue;
		const raw = item as Record<string, unknown>;
		if (typeof raw.id !== 'string' || !ID.test(raw.id) || seen.has(raw.id) || !isThemeId(raw.base)) continue;
		seen.add(raw.id);
		out.push({ id: raw.id, name: cleanName(raw.name), base: raw.base, values: cleanValues(raw.values), colors: cleanColors(raw.colors) });
		if (out.length === MAX_TEMPLATES) break;
	}
	return out;
}

/**
 * CSS de una plantilla: sus variables, sobre las de la plantilla original. Vale para la web (con
 * `data-tpl` en <html>, que pone /theme.js) y para la vista previa del editor (en `.site`).
 * Espera una plantilla ya reparada con `normalizeTemplates`.
 */
export function templateCss(template: TemplateDef): string {
	const decls: string[] = [];
	for (const control of CONTROLS) {
		const v = template.values[control.key];
		if (v === undefined) continue;
		const css = control.kind === 'range' ? control.css(Number(v)) : control.css(String(v));
		if (css) decls.push(css);
	}
	let paper = '';
	for (const { key } of COLORS) {
		const c = template.colors[key];
		if (!c) continue;
		const value = c.light && c.dark ? `light-dark(${c.light}, ${c.dark})` : (c.light ?? c.dark);
		if (!value) continue;
		decls.push(`--${key}:${value}`);
		if (key === 'paper') paper = value;
	}
	if (!decls.length) return '';
	const id = template.id;
	// .site.site gana a las reglas de las plantillas de la web (html[data-look] .site), vayan antes o después.
	let css = `html[data-tpl='${id}'] .site.site,.site.site[data-tpl='${id}']{${decls.join(';')}}`;
	// El fondo de la página (lo que se ve al pasar del final al hacer scroll) acompaña al de la web.
	if (paper) css += `html[data-tpl='${id}']{background:${paper}}`;
	return css;
}
