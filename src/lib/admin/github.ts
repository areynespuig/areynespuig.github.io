import { SITE } from '../config';

/** Error de GitHub con un mensaje pensado para mostrarse tal cual en el editor. */
export class GitHubError extends Error {
	constructor(
		public kind: 'auth' | 'forbidden' | 'not-found' | 'conflict' | 'network' | 'other',
		message: string
	) {
		super(message);
	}
}

const API = `https://api.github.com/repos/${SITE.owner}/${SITE.repo}`;

async function request<T>(token: string | null, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
	let res: Response;
	try {
		res = await fetch(API + path, {
			method: init.method ?? 'GET',
			cache: 'no-store',
			headers: {
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...(init.body ? { 'Content-Type': 'application/json' } : {})
			},
			body: init.body ? JSON.stringify(init.body) : undefined
		});
	} catch {
		throw new GitHubError('network', 'No hay conexión con GitHub. Revisa tu conexión y vuelve a intentarlo.');
	}
	if (res.ok) return (await res.json()) as T;
	if (res.status === 401)
		throw new GitHubError('auth', 'GitHub no acepta el token. Revisa que esté bien copiado y que no haya caducado.');
	if (res.status === 403)
		throw new GitHubError(
			'forbidden',
			`El token no puede escribir en ${SITE.repo}. Dale permiso de lectura y escritura en «Contents».`
		);
	if (res.status === 404)
		throw new GitHubError(
			'not-found',
			`No se encuentra ${SITE.owner}/${SITE.repo} o la rama ${SITE.branch}. Comprueba que el token tiene acceso a ese repositorio.`
		);
	if (res.status === 409 || res.status === 422)
		throw new GitHubError('conflict', 'GitHub ha rechazado el cambio porque la rama ha cambiado. Recarga el editor y vuelve a publicar.');
	throw new GitHubError('other', `GitHub ha respondido con un error ${res.status}. Vuelve a intentarlo en unos minutos.`);
}

export function utf8ToBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
	const binary = atob(b64.replace(/\s/g, ''));
	return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

interface ContentFile {
	sha: string;
	content: string;
}

/** Lee el contenido publicado en GitHub. Devuelve null si el fichero aún no existe en la rama. */
export async function fetchContent(token: string | null, ref: string = SITE.branch): Promise<{ sha: string; text: string } | null> {
	try {
		const file = await request<ContentFile>(token, `/contents/${SITE.contentPath}?ref=${encodeURIComponent(ref)}`);
		return { sha: file.sha, text: base64ToUtf8(file.content) };
	} catch (err) {
		if (err instanceof GitHubError && err.kind === 'not-found') return null;
		throw err;
	}
}

/** Comprueba que el token sirve para este repositorio. */
export async function checkAccess(token: string): Promise<void> {
	const repo = await request<{ permissions?: { push?: boolean } }>(token, '');
	if (repo.permissions && !repo.permissions.push) {
		throw new GitHubError('forbidden', `Tu cuenta no puede escribir en ${SITE.repo}.`);
	}
}

export interface FileToCommit {
	path: string;
	base64: string;
}

/**
 * Crea un único commit en la rama con todos los ficheros (contenido e imágenes nuevas).
 * Si el contenido en GitHub ha cambiado desde que se cargó el editor, no escribe nada.
 */
export async function commitFiles(
	token: string,
	options: { message: string; files: FileToCommit[]; expectedContentSha: string | null }
): Promise<{ commitSha: string; contentSha: string }> {
	const ref = await request<{ object: { sha: string } }>(token, `/git/ref/heads/${SITE.branch}`);
	const head = ref.object.sha;

	const current = await fetchContent(token, head);
	if ((current?.sha ?? null) !== options.expectedContentSha) {
		throw new GitHubError(
			'conflict',
			'El contenido en GitHub ha cambiado desde que abriste el editor. Recarga la página para traer la última versión; tu borrador se mantiene.'
		);
	}

	const parent = await request<{ tree: { sha: string } }>(token, `/git/commits/${head}`);
	const blobs = await Promise.all(
		options.files.map((f) =>
			request<{ sha: string }>(token, '/git/blobs', { method: 'POST', body: { content: f.base64, encoding: 'base64' } })
		)
	);
	const tree = await request<{ sha: string }>(token, '/git/trees', {
		method: 'POST',
		body: {
			base_tree: parent.tree.sha,
			tree: options.files.map((f, i) => ({ path: f.path, mode: '100644', type: 'blob', sha: blobs[i].sha }))
		}
	});
	const commit = await request<{ sha: string }>(token, '/git/commits', {
		method: 'POST',
		body: { message: options.message, tree: tree.sha, parents: [head] }
	});
	await request(token, `/git/refs/heads/${SITE.branch}`, { method: 'PATCH', body: { sha: commit.sha } });

	return { commitSha: commit.sha, contentSha: blobs[0].sha };
}
