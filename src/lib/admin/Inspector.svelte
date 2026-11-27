<script lang="ts">
	import { sectionVisible } from '../content/sections';
	import type { CustomSection } from '../content/types';
	import type { Editor } from './editor.svelte';
	import FieldEditor from './FieldEditor.svelte';
	import { sectionList } from './schema';

	let { editor }: { editor: Editor } = $props();

	const info = $derived(editor.info);
	const sectionName = $derived(sectionList(editor.draft).find((s) => s.id === info?.section)?.name ?? '');
	/** La sección nueva seleccionada, si lo es. */
	const custom = $derived(info?.isSection && !info.builtin ? (info.obj as CustomSection) : null);
	const hasTexts = $derived(info?.fields.some((f) => f.type === 'l10n' || f.type === 'l10nList') ?? false);
	/** Proyecto seleccionado (su tarjeta): puede tener página propia. */
	const project = $derived(
		info?.target.startsWith('projects:') ? editor.draft.projects.find((p) => p.id === info.id) : undefined
	);
	const pageProject = $derived(info?.pageOf ? editor.draft.projects.find((p) => p.id === info.pageOf) : undefined);
</script>

<aside class="insp" aria-labelledby="insp-title">
	{#if info}
		<div class="head">
			<p class="sec">
				{info.target === 'appearance'
					? 'Toda la web'
					: info.isSection
					? 'Sección de la página'
					: pageProject
						? `Página de «${pageProject.title || 'Proyecto sin nombre'}»`
						: `Sección: ${sectionName}`}
			</p>
			<h2 id="insp-title">{info.title}</h2>
			{#if info.isSection}
				<div class="actions">
					<button type="button" disabled={!editor.canMove(info, -1)} onclick={() => editor.move(info, -1)}>Subir sección</button>
					<button type="button" disabled={!editor.canMove(info, 1)} onclick={() => editor.move(info, 1)}>Bajar sección</button>
					{#if !info.builtin}
						<button type="button" class="danger" onclick={() => editor.remove(info)}>Quitar sección</button>
					{/if}
				</div>
			{:else if info.pageOf && !info.list}
				<div class="actions">
					<button type="button" onclick={() => editor.openHome()}>Volver a la portada</button>
					<button type="button" class="danger" onclick={() => editor.removeProjectPage(info.pageOf!)}>Quitar página</button>
				</div>
			{:else if info.list}
				<div class="actions">
					<button type="button" disabled={!editor.canMove(info, -1)} onclick={() => editor.move(info, -1)}>Mover arriba</button>
					<button type="button" disabled={!editor.canMove(info, 1)} onclick={() => editor.move(info, 1)}>Mover abajo</button>
					<button type="button" class="danger" onclick={() => editor.remove(info)}>Quitar</button>
				</div>
			{/if}
		</div>

		{#if info.builtin}
			<p class="note">
				El título de esta sección viene con la web y se traduce solo. Puedes cambiar su posición en la página; para editar su
				contenido, haz clic en él en la vista previa.
			</p>
		{:else if custom}
			{#if !sectionVisible(custom)}
				<p class="note warn">Esta sección no se verá en la web hasta que tenga título y algo de contenido.</p>
			{/if}
			{#if custom.layout === 'text' && custom.items.length}
				<p class="note">
					{custom.items.length === 1
						? 'Hay 1 entrada guardada que no se muestra en una sección de texto. Vuelve a aparecer'
						: `Hay ${custom.items.length} entradas guardadas que no se muestran en una sección de texto. Vuelven a aparecer`}
					si cambias a «Lista con fechas» o «Tarjetas».
				</p>
			{/if}
		{/if}

		{#each info.fields as field (`${info.target}-${field.key}`)}
			<FieldEditor {editor} {info} {field} />
		{/each}

		{#if project}
			<section class="page-box" aria-labelledby="page-box-h">
				<h3 id="page-box-h">Página del proyecto</h3>
				{#if project.page}
					<p>Se abre con el botón «Cómo funciona» de la tarjeta, en /proyectos/{project.page.slug}/.</p>
					<div class="row">
						{#if editor.viewProject?.id !== project.id}
							<button type="button" class="add" onclick={() => editor.openProjectPage(project.id)}>Abrir la página</button>
						{/if}
						<button type="button" class="add danger-text" onclick={() => editor.removeProjectPage(project.id)}>Quitar página</button>
					</div>
				{:else}
					<p>Una página propia para contar el proyecto con más detalle: cómo funciona, cómo se usa o cómo se hizo.</p>
					<button type="button" class="add" onclick={() => editor.createProjectPage(project.id)}>Crear página del proyecto</button>
				{/if}
			</section>
		{/if}

		{#if custom && custom.layout !== 'text'}
			<button type="button" class="add" onclick={() => editor.addItem(custom.id)}>
				{custom.layout === 'list' ? 'Añadir entrada' : 'Añadir tarjeta'}
			</button>
		{/if}

		{#if hasTexts}
			<p class="hint">
				Cuando cambias un idioma, los otros dos se marcan para revisar hasta que los edites o confirmes que están bien.
			</p>
		{/if}
	{:else}
		<h2 id="insp-title">Nada seleccionado</h2>
		<p class="hint">Haz clic en cualquier texto de la vista previa para editarlo.</p>
	{/if}
</aside>

<style>
	.insp {
		position: relative;
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
	.actions button,
	.add {
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
	.actions button:hover:not(:disabled),
	.add:hover {
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
	.add {
		align-self: flex-start;
	}
	.page-box {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		padding: 14px;
		border-radius: 10px;
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.page-box h3 {
		margin: 0;
		font-size: 15px;
	}
	.page-box p {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
		overflow-wrap: anywhere;
	}
	.page-box .row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.danger-text {
		color: #8a1f14;
	}
	.note {
		margin: 0;
		padding: 10px 12px;
		border-radius: 8px;
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--line);
		font-size: 13px;
		color: var(--muted);
	}
	.note.warn {
		background: #fff1c7;
		box-shadow: none;
		color: #5e4300;
	}
	.hint {
		margin: auto 0 0;
		padding-top: 14px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		color: var(--muted);
	}
</style>
