/** Dónde vive la web. */
export const SITE = {
	url: 'https://areynespuig.github.io'
} as const;

/**
 * Proyecto de Supabase donde se guarda el contenido.
 * Ambos valores son públicos por diseño (van en el navegador): lo que protege los datos son las
 * políticas de Row Level Security de supabase/migrations. Nunca pongas aquí la clave secreta
 * (service_role / sb_secret_…).
 * Mientras estén vacíos, la web usa src/lib/content/site.json y el editor muestra cómo configurarlo.
 */
export const SUPABASE: { readonly url: string; readonly publishableKey: string; readonly bucket: string } = {
	url: 'https://vzesotetdqhyielkhbcy.supabase.co',
	publishableKey: 'sb_publishable_uPayIXggVQ-qGYe6F3forQ_mKTmDfhO',
	/** Bucket de Storage donde el editor sube fotos, imágenes y PDF. */
	bucket: 'portfolio'
};

export const supabaseConfigured = SUPABASE.url !== '' && SUPABASE.publishableKey !== '';
