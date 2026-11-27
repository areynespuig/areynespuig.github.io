export const LANGS = ['es', 'ca', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** Un texto en los tres idiomas de la web. */
export type L10n = Record<Lang, string>;
/** Una lista de textos (una línea por elemento) en los tres idiomas. */
export type L10nList = Record<Lang, string[]>;

/**
 * Cómo se ve la foto dentro de su recuadro: zoom (1 = llena el recuadro) y desplazamiento
 * en % del recuadro. El recuadro no cambia; lo que sobresale queda recortado.
 */
export interface PhotoFrame {
	zoom: number;
	x: number;
	y: number;
}

export const PHOTO_FRAME_DEFAULT: PhotoFrame = { zoom: 1, x: 0, y: 0 };
export const PHOTO_ZOOM = { min: 0.5, max: 3 } as const;
export const PHOTO_OFFSET_MAX = 100;

export interface Profile {
	name: string;
	photo: string;
	/** Tamaño original de la foto: el recuadro de la web toma su proporción para no recortarla. */
	photoDimensions?: { width: number; height: number };
	photoFrame?: PhotoFrame;
	photoAlt: L10n;
	cv: string;
	linkedin: string;
	github: string;
}

export interface Hero {
	availability: L10n;
	greeting: L10n;
	subtitle: L10n;
}

export interface About {
	bio: L10n;
	skills: L10nList;
}

export interface Education {
	id: string;
	title: L10n;
	school: L10n;
	start: number | null;
	end: number | null;
	ongoing: boolean;
}

export interface Experience {
	id: string;
	role: L10n;
	company: string;
	kind: L10n;
	start: number | null;
	end: number | null;
	ongoing: boolean;
	description: L10n;
}

export interface Project {
	id: string;
	title: string;
	description: L10n;
	image: string;
	imageAlt: L10n;
	url: string;
	year: number | null;
	/** Página propia del proyecto (por ejemplo, para explicar cómo funciona). Sin ella, la tarjeta no enlaza a ninguna página. */
	page?: ProjectPage;
}

/** Un bloque de la página de un proyecto: un paso de un tutorial o un apartado con título, texto e imagen. */
export interface PageBlock {
	id: string;
	title: L10n;
	body: L10n;
	image: string;
	imageAlt: L10n;
}

export interface ProjectPage {
	/** Parte final de la dirección: /proyectos/<slug>/, /ca/projectes/<slug>/ y /en/projects/<slug>/. */
	slug: string;
	/** Texto de entrada bajo el título. Si está vacío, se usa la descripción de la tarjeta. */
	intro: L10n;
	/** Numera los bloques como pasos de un tutorial. */
	steps: boolean;
	blocks: PageBlock[];
}

/** Secciones que vienen de serie con la web; su título es fijo y siempre se muestran. */
export const BUILTIN_SECTIONS = ['sobre', 'educacion', 'experiencia', 'proyectos'] as const;
export type BuiltinSection = (typeof BUILTIN_SECTIONS)[number];

/**
 * Cómo se presenta una sección creada desde el editor:
 * texto (como «Sobre mí»), lista con fechas (como «Experiencia») o tarjetas con imagen (como «Proyectos»).
 */
export type SectionLayout = 'text' | 'list' | 'cards';
export const SECTION_LAYOUTS: readonly SectionLayout[] = ['text', 'list', 'cards'];

/**
 * Una entrada de una sección nueva. Todas las entradas tienen los mismos campos, así se puede
 * cambiar el tipo de sección sin perder nada; cada tipo muestra solo los que usa.
 */
export interface SectionItem {
	id: string;
	title: L10n;
	subtitle: L10n;
	description: L10n;
	start: number | null;
	end: number | null;
	ongoing: boolean;
	image: string;
	imageAlt: L10n;
	url: string;
}

export interface CustomSection {
	id: string;
	layout: SectionLayout;
	title: L10n;
	/** El texto de una sección de texto, o la introducción de una lista o de unas tarjetas. */
	body: L10n;
	/** Lista de puntos de una sección de texto (como las competencias de «Sobre mí»). */
	points: L10nList;
	items: SectionItem[];
}

export interface SiteContent {
	profile: Profile;
	hero: Hero;
	about: About;
	education: Education[];
	experience: Experience[];
	projects: Project[];
	/** Tema de la web y temas que pueden elegir los visitantes (ver `themes.ts`). */
	appearance?: { theme: string; choices: string[] };
	/** Secciones añadidas desde el editor. */
	sections?: CustomSection[];
	/** Orden de todas las secciones bajo la portada: las de serie y las nuevas, por su id. */
	order?: string[];
	meta: {
		/** Campos que hay que revisar en algún idioma, por clave de campo. */
		review: Record<string, Lang[]>;
	};
}

export type CollectionKey = 'education' | 'experience' | 'projects';
