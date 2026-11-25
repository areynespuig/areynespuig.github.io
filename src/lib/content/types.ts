export const LANGS = ['es', 'ca', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** Un texto en los tres idiomas de la web. */
export type L10n = Record<Lang, string>;
/** Una lista de textos (una línea por elemento) en los tres idiomas. */
export type L10nList = Record<Lang, string[]>;

export interface Profile {
	name: string;
	photo: string;
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
}

export interface SiteContent {
	profile: Profile;
	hero: Hero;
	about: About;
	education: Education[];
	experience: Experience[];
	projects: Project[];
	meta: {
		/** Campos que hay que revisar en algún idioma, por clave de campo. */
		review: Record<string, Lang[]>;
	};
}

export type CollectionKey = 'education' | 'experience' | 'projects';
