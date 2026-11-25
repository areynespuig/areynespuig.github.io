<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useEditor } from './editor-context';

	let {
		target,
		label,
		as = 'span',
		block = false,
		children
	}: {
		/** Identificador del bloque o entrada que se edita al hacer clic. */
		target: string;
		/** Nombre legible para lectores de pantalla. */
		label: string;
		as?: 'span' | 'div';
		block?: boolean;
		children: Snippet;
	} = $props();

	const editor = useEditor();
</script>

{#if editor}
	<svelte:element
		this={as}
		class={[
			'editable',
			block && 'is-block',
			editor.isSelected(target) && 'is-selected',
			editor.isFlagged(target) && 'is-flagged'
		]}
		data-target={target}
	>
		<svelte:element this={as} class="editable-content" inert>
			{@render children()}
		</svelte:element>
		<button
			type="button"
			class="editable-hit"
			aria-label={`Editar: ${label}`}
			aria-pressed={editor.isSelected(target)}
			onclick={() => editor.select(target)}
		></button>
	</svelte:element>
{:else}
	{@render children()}
{/if}

<style>
	.editable {
		position: relative;
		display: inline-block;
		border-radius: 6px;
		outline-offset: 6px;
	}
	.editable.is-block {
		display: block;
	}
	.editable-content {
		display: inherit;
	}
	.editable-hit {
		position: absolute;
		inset: -6px;
		z-index: 2;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 8px;
		background: transparent;
		cursor: text;
	}
	.editable:hover {
		outline: 1px dashed oklch(0.8 0.17 85);
	}
	.editable.is-selected {
		outline: 2px solid oklch(0.8 0.17 85);
		background: oklch(0.8 0.17 85 / 0.08);
	}
	.editable-hit:focus-visible {
		outline: 3px solid oklch(0.8 0.17 85);
		outline-offset: 0;
	}
	.editable.is-flagged .editable-content {
		text-decoration: underline wavy oklch(0.8 0.17 85);
		text-decoration-thickness: 1.5px;
		text-underline-offset: 0.3em;
	}
</style>
