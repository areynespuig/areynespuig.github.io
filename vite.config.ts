import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SUPABASE } from './src/lib/config';

/** Dominio de Supabase (datos, sesión, archivos y función de publicar), si está configurado. */
const supabase = SUPABASE.url ? [SUPABASE.url as `https://${string}.${string}`] : [];

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// 404.html abre la app en las direcciones que no se generaron: así la página de un proyecto
			// recién publicado se ve (leyéndola de Supabase) antes de que GitHub regenere la web.
			adapter: adapter({ fallback: '404.html' }),
			prerender: {
				// Sin ningún proyecto con página, las rutas de proyectos no se generan, y es correcto.
				handleUnseenRoutes: 'ignore'
			},
			/*
			 * Política de seguridad de contenido (va en una etiqueta <meta>, porque GitHub Pages no deja
			 * enviar cabeceras). Solo se ejecutan los scripts de la propia web (SvelteKit añade el hash de
			 * los suyos) y solo se conecta con la web y con Supabase. Si algún día se colara código en la
			 * página, no podría cargar scripts de fuera ni enviar la sesión del editor a otro sitio.
			 * Los estilos en línea se permiten: los usa Svelte para el encuadre de la foto y similares.
			 * `data:` sirve para la vista previa de las imágenes que aún no se han subido.
			 */
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', ...supabase],
					'font-src': ['self'],
					'connect-src': ['self', 'data:', ...supabase],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self']
				}
			}
		})
	]
});
