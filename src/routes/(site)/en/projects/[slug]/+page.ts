import { loadProjectRoute } from '#lib/content/project-route.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = (event) => loadProjectRoute(event);
