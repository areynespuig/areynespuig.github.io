// Edge Function «publish»: la llama el editor después de guardar el contenido.
// Comprueba que quien llama es el administrador y pide a GitHub que vuelva a generar la web.
// El token de GitHub vive solo aquí, como secreto GITHUB_TOKEN de Supabase; nunca llega al navegador.
import { createClient } from 'npm:@supabase/supabase-js@2';

const REPO = 'areynespuig/areynespuig.github.io';
const WORKFLOW = 'deploy.yml';
const ALLOWED_ORIGINS = new Set(['https://areynespuig.github.io', 'http://localhost:5173', 'http://localhost:4173']);

function corsHeaders(origin: string | null): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://areynespuig.github.io',
		'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		Vary: 'Origin'
	};
}

/** Qué hay que revisar según la respuesta de GitHub. */
const GITHUB_HINTS: Record<number, string> = {
	401: 'El token de GitHub no es válido o ha caducado. Crea uno nuevo y guárdalo en el secreto GITHUB_TOKEN de Supabase.',
	403: 'El token de GitHub no tiene permiso para lanzar Actions. En el token, da «Actions: Read and write» a este repositorio.',
	404: `El token de GitHub no tiene acceso a ${REPO}. Créalo con la cuenta areynespuig y elige este repositorio en «Repository access».`,
	422: 'GitHub no deja lanzar deploy.yml a mano. Comprueba que el flujo tiene «workflow_dispatch» en la rama main.'
};

function reply(body: unknown, status: number, headers: Record<string, string>): Response {
	return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
	const headers = corsHeaders(req.headers.get('Origin'));
	if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
	if (req.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405, headers);

	const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
	if (!jwt) return reply({ error: 'Falta la sesión.' }, 401, headers);

	const url = Deno.env.get('SUPABASE_URL');
	const key = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
	if (!url || !key) return reply({ error: 'La función no tiene la configuración de Supabase.' }, 500, headers);

	// Cliente que actúa como el usuario que llama: las comprobaciones pasan por sus permisos reales.
	const supabase = createClient(url, key, {
		global: { headers: { Authorization: `Bearer ${jwt}` } },
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
	if (userError || !userData.user) {
		console.error('Sesión rechazada:', userError?.message);
		return reply({ error: 'La sesión no es válida. Vuelve a entrar.' }, 401, headers);
	}

	const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
	if (adminError || isAdmin !== true) {
		console.error('Sin permiso de administrador:', adminError?.message);
		return reply({ error: 'Esta cuenta no puede publicar.' }, 403, headers);
	}

	// Sin espacios ni saltos de línea: al pegar el token es fácil arrastrar alguno y GitHub lo rechaza.
	const token = Deno.env.get('GITHUB_TOKEN')?.trim();
	if (!token) return reply({ error: 'Falta el secreto GITHUB_TOKEN en Supabase.' }, 500, headers);

	const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'portfolio-publish-function'
		},
		body: JSON.stringify({ ref: 'main' })
	});
	if (!res.ok) {
		const detail = ((await res.json().catch(() => null)) as { message?: string } | null)?.message ?? '';
		console.error('GitHub ha rechazado la petición:', res.status, detail);
		const hint = GITHUB_HINTS[res.status] ?? `GitHub no ha aceptado la petición (error ${res.status}).`;
		return reply({ error: detail ? `${hint} GitHub dice: «${detail}».` : hint }, 502, headers);
	}

	return reply({ ok: true }, 202, headers);
});
