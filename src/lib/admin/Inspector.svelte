<script lang="ts">
	import type { Editor } from './editor.svelte';
	import FieldEditor from './FieldEditor.svelte';
	import { SECTIONS } from './schema';

	let { editor }: { editor: Editor } = $props();

	const info = $derived(editor.info);
	const sectionName = $derived(SECTIONS.find((s) => s.id === info?.section)?.name ?? '');
</script>

<aside class="insp" aria-labelledby="insp-title">
	{#if info}
		<div class="head">
			<p class="sec">Sección: {sectionName}</p>
			<h2 id="insp-title">{info.title}</h2>
			{#if info.collection}
				<div class="actions">
					<button type="button" disabled={!editor.canMove(info, -1)} onclick={() => editor.move(info, -1)}>Mover arriba</button>
					<button type="button" disabled={!editor.canMove(info, 1)} onclick={() => editor.move(info, 1)}>Mover abajo</button>
					<button type="button" class="danger" onclick={() => editor.remove(info)}>Quitar</button>
				</div>
			{/if}
		</div>
		{#each info.fields as field (`${info.target}-${field.key}`)}
			<FieldEditor {editor} {info} {field} />
		{/each}
		<p class="hint">
			Cuando cambias un idioma, los otros dos se marcan para revisar hasta que los edites o confirmes que están bien.
		</p>
	{:else}
		<h2 id="insp-title">Nada seleccionado</h2>
		<p class="hint">Haz clic en cualquier texto de la vista previa para editarlo.</p>
	{/if}
</aside>

<style>
	.insp {
		background: var(--panel);
		border-left: 1px solid var(--line);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 22px;
		overflow: auto;
	}
	.head {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.sec {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}
	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 700;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}
	.actions button {
		appearance: none;
		min-height: 36px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.actions button:hover:not(:disabled) {
		border-color: var(--ink);
	}
	.actions button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.actions .danger {
		margin-left: auto;
		color: #8a1f14;
	}
	.actions .danger:hover {
		border-color: #8a1f14;
	}
	.hint {
		margin: auto 0 0;
		padding-top: 14px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		color: var(--muted);
	}
</style>
