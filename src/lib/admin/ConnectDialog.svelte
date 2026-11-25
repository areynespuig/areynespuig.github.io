<script lang="ts">
	import { SITE } from '../config';
	import type { Editor } from './editor.svelte';

	let { editor }: { editor: Editor } = $props();

	let dialog = $state<HTMLDialogElement>();
	let token = $state('');
	let remember = $state(false);
	let error = $state<string | null>(null);
	let checking = $state(false);

	$effect(() => {
		if (!dialog) return;
		if (editor.connectOpen && !dialog.open) {
			error = null;
			dialog.showModal();
		} else if (!editor.connectOpen && dialog.open) {
			dialog.close();
		}
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		checking = true;
		error = await editor.connect(token, remember);
		checking = false;
		if (!error) token = '';
	}
</script>

<dialog bind:this={dialog} onclose={() => (editor.connectOpen = false)} aria-labelledby="conn-h">
	<form onsubmit={submit}>
		<h2 id="conn-h">Conectar con GitHub</h2>
		<p>
			Al publicar, el editor guarda los cambios directamente en tu repositorio y GitHub vuelve a generar la web. Para eso necesita
			un token personal con permiso solo sobre <strong>{SITE.repo}</strong>.
		</p>
		<ol>
			<li>
				Abre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">crear un token en GitHub</a>
				(se abre en una pestaña nueva).
			</li>
			<li>En «Repository access», elige «Only select repositories» y marca {SITE.repo}.</li>
			<li>En «Expiration», elige una caducidad corta, por ejemplo 30 días.</li>
			<li>En «Permissions», da a «Contents» acceso «Read and write».</li>
			<li>Genera el token, cópialo y pégalo aquí.</li>
		</ol>
		<label for="conn-token">Token</label>
		<input id="conn-token" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…" bind:value={token} />
		<label class="check"><input type="checkbox" bind:checked={remember} /> Recordar en este navegador</label>
		<p class="note">
			El token solo se envía a GitHub. Sin «Recordar», se borra al cerrar la pestaña. Si lo recuerdas, queda guardado en este
			navegador y podría leerlo cualquier página publicada en {SITE.owner}.github.io, así que no lo marques en ordenadores
			compartidos. Puedes borrarlo en cualquier momento con «Desconectar».
		</p>
		{#if error}<p class="error" role="alert">{error}</p>{/if}
		<div class="buttons">
			<button type="button" class="btn" onclick={() => dialog?.close()}>Cancelar</button>
			<button type="submit" class="btn primary" disabled={checking}>{checking ? 'Comprobando…' : 'Conectar'}</button>
		</div>
	</form>
</dialog>

<style>
	dialog {
		width: min(34rem, calc(100vw - 2rem));
		border: 0;
		border-radius: 12px;
		padding: 0;
		color: var(--ink);
		background: var(--panel);
		box-shadow: 0 24px 60px rgba(35, 37, 58, 0.35);
		font: inherit;
	}
	dialog::backdrop {
		background: rgba(35, 37, 58, 0.45);
	}
	form {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
	}
	p,
	ol {
		margin: 0;
	}
	ol {
		padding-left: 1.3em;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	a {
		color: var(--ink);
		font-weight: 600;
	}
	label[for] {
		font-weight: 600;
		margin-top: 6px;
	}
	input[type='password'] {
		font: inherit;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
	}
	input[type='password']:focus {
		outline: 2px solid var(--ink);
		outline-offset: 0;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		cursor: pointer;
	}
	.check input {
		width: 18px;
		height: 18px;
		accent-color: var(--ink);
	}
	.note {
		font-size: 13px;
		color: var(--muted);
	}
	.error {
		background: #fce3e0;
		color: #8a1f14;
		padding: 10px 12px;
		border-radius: 8px;
		font-weight: 600;
	}
	.buttons {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 8px;
	}
	.btn {
		appearance: none;
		min-height: 44px;
		padding: 0 18px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.btn.primary {
		background: var(--marker);
		border-color: #d9a200;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
