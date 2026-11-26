import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

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
			}
		})
	]
});
