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
	if (userError || !userData.user) return reply({ error: 'La sesión no es válida. Vuelve a entrar.' }, 401, headers);

	const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
	if (adminError || isAdmin !== true) return reply({ error: 'Esta cuenta no puede publicar.' }, 403, headers);

	const token = Deno.env.get('GITHUB_TOKEN');
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
	if (!res.ok) return reply({ error: `GitHub no ha aceptado la petición (${res.status}).` }, 502, headers);

	return reply({ ok: true }, 202, headers);
});
