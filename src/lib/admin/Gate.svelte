<script lang="ts">
	import type { Editor } from './editor.svelte';

	let { editor }: { editor: Editor } = $props();

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	$effect(() => {
		if (editor.loginError) error = editor.loginError;
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = await editor.login(email, password);
		busy = false;
		password = '';
	}
</script>

<main class="gate">
	{#if editor.phase === 'loading'}
		<p class="card loading" role="status">Comprobando la sesión…</p>
	{:else if editor.phase === 'login'}
		<form class="card" onsubmit={submit} aria-labelledby="login-h">
			<h1 id="login-h">Editor del portafolio</h1>
			<p>Entra con tu cuenta para editar la web.</p>
			<label for="login-email">Correo electrónico</label>
			<input id="login-email" type="email" autocomplete="username" required bind:value={email} />
			<label for="login-password">Contraseña</label>
			<input id="login-password" type="password" autocomplete="current-password" required bind:value={password} />
			{#if error}<p class="error" role="alert">{error}</p>{/if}
			<button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
			<p class="note">La sesión se cierra al cerrar esta pestaña.</p>
		</form>
	{:else if editor.phase === 'error'}
		<div class="card" role="alert">
			<h1>No se puede abrir el editor</h1>
			<p>{editor.fatal}</p>
			<button type="button" onclick={() => editor.retry()}>Reintentar</button>
		</div>
	{:else if editor.phase === 'unconfigured'}
		<div class="card">
			<h1>Falta conectar Supabase</h1>
			<p>
				El editor guarda el contenido en Supabase, pero esta web aún no tiene los datos del proyecto. Rellena
				<code>url</code> y <code>publishableKey</code> en <code>src/lib/config.ts</code> siguiendo
				<code>docs/SUPABASE.md</code>, y vuelve a publicar la web.
			</p>
		</div>
	{/if}
</main>

<style>
	.gate {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 24px;
	}
	.card {
		width: min(26rem, 100%);
		margin: 0;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		box-shadow: 0 14px 36px rgba(35, 37, 58, 0.12);
	}
	.loading {
		color: var(--muted);
		text-align: center;
	}
	h1 {
		margin: 0 0 4px;
		font-size: 22px;
	}
	p {
		margin: 0;
	}
	label {
		font-weight: 600;
		margin-top: 8px;
	}
	input {
		font: inherit;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		color: var(--ink);
	}
	input:focus {
		outline: 2px solid var(--ink);
		outline-offset: 0;
		border-color: var(--ink);
	}
	button {
		margin-top: 12px;
		appearance: none;
		min-height: 44px;
		border-radius: 8px;
		border: 1px solid #d9a200;
		background: var(--marker);
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.error {
		background: #fce3e0;
		color: #8a1f14;
		padding: 10px 12px;
		border-radius: 8px;
		font-weight: 600;
	}
	.note {
		font-size: 13px;
		color: var(--muted);
		text-align: center;
	}
	code {
		font-size: 13px;
		background: #eceef2;
		padding: 1px 5px;
		border-radius: 4px;
	}
</style>
