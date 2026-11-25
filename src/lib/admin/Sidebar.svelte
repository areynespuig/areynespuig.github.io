<script lang="ts">
	import type { Lang } from '../content/types';
	import { formatDate, type Editor } from './editor.svelte';
	import { resolveTarget, SECTIONS } from './schema';

	let { editor }: { editor: Editor } = $props();

	const LOWER: Record<Lang, string> = { es: 'castellano', ca: 'catalán', en: 'inglés' };

	let photoInput = $state<HTMLInputElement>();
	let cvInput = $state<HTMLInputElement>();

	/** Un aviso por campo y tipo, con todos los idiomas afectados juntos. */
	const grouped = $derived.by(() => {
		const map = new Map<string, { target: string; title: string; field: string; kind: 'missing' | 'review'; langs: Lang[] }>();
		for (const i of editor.issues) {
			const key = `${i.target}|${i.field}|${i.kind}`;
			const entry = map.get(key) ?? { target: i.target, title: i.title, field: i.field, kind: i.kind, langs: [] };
			entry.langs.push(i.lang);
			map.set(key, entry);
		}
		return [...map.entries()].map(([key, v]) => ({ key, ...v }));
	});

	function langList(langs: Lang[]): string {
		const names = langs.map((l) => LOWER[l]);
		if (names.length < 2) return names[0];
		const last = names.at(-1)!;
		return `${names.slice(0, -1).join(', ')} ${last.startsWith('i') ? 'e' : 'y'} ${last}`;
	}

	function counts(section: string): number {
		return editor.issues.filter((i) => i.section === section).length;
	}
	function goTo(id: string) {
		document.getElementById(id)?.scrollIntoView({
			block: 'start',
			behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
		});
	}
	function upload(key: 'photo' | 'cv', input: HTMLInputElement) {
		const file = input.files?.[0];
		const info = resolveTarget(editor.draft, 'profile');
		if (file && info) editor.upload(info, key, file);
		input.value = '';
	}
</script>

<aside class="side">
	<nav aria-labelledby="secs-h">
		<h2 id="secs-h">Secciones de la página</h2>
		<ul class="secs">
			{#each SECTIONS as s (s.id)}
				{@const n = counts(s.id)}
				<li>
					<button type="button" class={['sec', editor.info?.section === s.id && 'is-cur']} onclick={() => goTo(s.id)}>
						<span>{s.name}</span>
						{#if n}<span class="pill">{n} {n === 1 ? 'pendiente' : 'pendientes'}</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	</nav>

	<section aria-labelledby="pend-h">
		<h2 id="pend-h">Por revisar</h2>
		{#if grouped.length}
			<ul class="pend">
				{#each grouped as issue (issue.key)}
					<li>
						<button type="button" onclick={() => editor.reveal(issue.target, issue.langs[0])}>
							<strong>{issue.title}</strong>
							<span>
								{issue.field ? `${issue.field}: ` : ''}{issue.kind === 'missing' ? 'falta en' : 'revisar en'}
								{langList(issue.langs)}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="quiet">Nada pendiente: los tres idiomas están completos y al día.</p>
		{/if}
	</section>

	<section aria-labelledby="files-h">
		<h2 id="files-h">Archivos</h2>
		<div class="file">
			<img src={editor.asset(editor.draft.profile.photo)} alt="" />
			<div class="meta"><strong>Foto de perfil</strong><span>{editor.draft.profile.photo.split('/').pop()}</span></div>
			<button type="button" class="mini" onclick={() => photoInput?.click()}>Cambiar</button>
			<input bind:this={photoInput} type="file" accept="image/png,image/jpeg,image/webp,image/avif" class="visually-hidden" tabindex="-1" aria-hidden="true" onchange={(e) => upload('photo', e.currentTarget)} />
		</div>
		<div class="file">
			<span class="ico" aria-hidden="true">PDF</span>
			<div class="meta"><strong>Currículum</strong><span>{editor.draft.profile.cv.split('/').pop()}</span></div>
			<button type="button" class="mini" onclick={() => cvInput?.click()}>Reemplazar</button>
			<input bind:this={cvInput} type="file" accept="application/pdf" class="visually-hidden" tabindex="-1" aria-hidden="true" onchange={(e) => upload('cv', e.currentTarget)} />
		</div>
	</section>

	{#if !editor.offline}
		<section aria-labelledby="hist-h">
			<h2 id="hist-h">Historial</h2>
			{#if editor.history.length}
				<ul class="hist">
					{#each editor.history as version, i (version.id)}
						<li>
							{#if i === 0}
								<span class="hist-row current">
									<span>{formatDate(version.created_at)}</span>
									<span class="tag">Publicada</span>
								</span>
							{:else}
								<button type="button" class="hist-row" onclick={() => editor.restoreVersion(version)}>
									<span>{formatDate(version.created_at)}</span>
									<span class="restore">Cargar</span>
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="quiet">Aún no hay versiones guardadas.</p>
			{/if}
		</section>
	{/if}

	<section aria-labelledby="ses-h" class="gh">
		<h2 id="ses-h">Sesión</h2>
		{#if editor.offline}
			<p>Modo local: Supabase no está configurado, así que puedes editar pero no publicar.</p>
		{:else}
			<p>Has entrado como {editor.email}.</p>
			{#if editor.needsRebuild}
				<button type="button" class="mini" onclick={() => editor.rebuild()}>Actualizar la web</button>
			{/if}
			<button type="button" class="mini" onclick={() => editor.logout()}>Cerrar sesión</button>
		{/if}
	</section>
</aside>

<style>
	.side {
		background: var(--panel);
		border-right: 1px solid var(--line);
		padding: 20px 14px;
		display: flex;
		flex-direction: column;
		gap: 28px;
		overflow: auto;
	}
	h2 {
		margin: 0 0 8px;
		padding: 0 4px;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.secs {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.sec {
		width: 100%;
		appearance: none;
		border: 0;
		background: transparent;
		font: inherit;
		color: var(--ink);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 40px;
		padding: 0 10px;
		border-radius: 6px;
		text-align: left;
		font-weight: 500;
		cursor: pointer;
	}
	.sec:hover {
		background: #eceef2;
	}
	.sec.is-cur {
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--line);
		font-weight: 600;
	}
	.pill {
		font-size: 12px;
		font-weight: 600;
		background: #fff1c7;
		color: #5e4300;
		padding: 2px 8px;
		border-radius: 999px;
		white-space: nowrap;
	}
	.pend {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.pend button {
		width: 100%;
		appearance: none;
		text-align: left;
		font: inherit;
		color: var(--ink);
		padding: 8px 10px;
		border-radius: 6px;
		border: 0;
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--line);
		cursor: pointer;
	}
	.pend button:hover {
		box-shadow: inset 0 0 0 1px var(--ink);
	}
	.pend strong {
		display: block;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.pend span {
		font-size: 13px;
		color: var(--muted);
	}
	.quiet,
	.gh p {
		margin: 0 4px;
		font-size: 13px;
		color: var(--muted);
	}
	.hist {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.hist-row {
		width: 100%;
		appearance: none;
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 13px;
		color: var(--ink);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 36px;
		padding: 0 10px;
		border-radius: 6px;
		text-align: left;
	}
	button.hist-row {
		cursor: pointer;
	}
	button.hist-row:hover {
		background: #eceef2;
	}
	.restore {
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.tag {
		font-size: 12px;
		color: var(--muted);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 1px 8px;
		background: #fff;
	}
	.gh {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		margin-top: auto;
	}
	.gh .mini {
		margin-left: 4px;
	}
	.file {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 4px;
	}
	.file img {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}
	.ico {
		width: 40px;
		height: 40px;
		border-radius: 6px;
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--line);
		display: grid;
		place-items: center;
		font-size: 11px;
		font-weight: 700;
		color: #8a1f14;
	}
	.meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		line-height: 1.25;
	}
	.meta strong {
		font-weight: 600;
	}
	.meta span {
		font-size: 12px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mini {
		appearance: none;
		min-height: 36px;
		padding: 0 10px;
		border-radius: 6px;
		border: 1px solid var(--line);
		background: #fff;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		color: var(--ink);
		cursor: pointer;
	}
	.mini:hover {
		border-color: var(--ink);
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
