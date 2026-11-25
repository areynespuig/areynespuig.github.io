/** Dónde vive la web y dónde guarda el editor los cambios. */
export const SITE = {
	url: 'https://areynespuig.github.io',
	owner: 'areynespuig',
	repo: 'areynespuig.github.io',
	branch: 'main',
	/** Fichero con todo el contenido de la web. El editor lo reescribe al publicar. */
	contentPath: 'src/lib/content/site.json',
	/** Carpeta del repositorio donde se suben las imágenes y PDF nuevos. */
	uploadsDir: 'static/uploads'
} as const;
