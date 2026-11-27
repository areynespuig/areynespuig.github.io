<script lang="ts">
	import { lookInfo, normalizeAppearance } from '../content/appearance';
	import { THEME_IDS } from '../content/themes';
	import type { Editor } from './editor.svelte';
	import type { TargetInfo } from './schema';

	/** Apariencia de la web: la plantilla principal, las que pueden elegir los visitantes y las propias. */
	let { editor, info }: { editor: Editor; info: TargetInfo } = $props();

	const appearance = $derived(normalizeAppearance(info.obj));
	const builtIn = $derived(THEME_IDS.map((id) => lookInfo(appearance, id)));
	const own = $derived(appearance.templates.map((t) => lookInfo(appearance, t.id)));
	const main = $derived(lookInfo(appearance, appearance.theme));

	/** La plantilla principal nueva sustituye a la anterior entre las elegibles; el resto se mantiene. */
	function setMain(id: string) {
		const others = appearance.choices.filter((c) => c !== appearance.theme);
		editor.setValue(info, 'theme', id);
		editor.setValue(info, 'choices', normalizeAppearance({ ...appearance, theme: id, choices: [...others, id] }).choices);
	}
	function toggle(id: string, on: boolean) {
		const next = on ? [...appearance.choices, id] : appearance.choices.filter((c) => c !== id);
		editor.setValue(info, 'choices', normalizeAppearance({ ...appearance, choices: next }).choices);
	}
	function remove() {
		const name = main.name('es');
		if (confirm(`¿Eliminar la plantilla «${name}»? La web volverá a usar ${lookInfo(appearance, main.base).name('es')}.`)) {
			editor.deleteTemplate(main.id);
		}
	}
</script>

{#snippet option(look: ReturnType<typeof lookInfo>)}
	<label class={['look', appearance.theme === look.id && 'is-on']}>
		<input type="radio" name="look-main" checked={appearance.theme === look.id} onchange={() => setMain(look.id)} />
		<span class="sw" aria-hidden="true">
			{#each look.swatches as color, i (i)}<i style:background={color}></i>{/each}
		</span>
		<span class="txt">
			<strong>{look.name('es')}</strong>
			<span>{look.hint}</span>
		</span>
	</label>
{/snippet}

<fieldset class="group">
	<legend class="group-label">Plantilla principal</legend>
	<p class="hint">Es la que ve cualquiera que entra en la web. La vista previa cambia al momento.</p>
	{#if own.length}
		<p class="sub">Tus plantillas</p>
		<div class="looks">
			{#each own as look (look.id)}{@render option(look)}{/each}
		</div>
		<p class="sub">Plantillas de la web</p>
	{/if}
	<div class="looks">
		{#each builtIn as look (look.id)}{@render option(look)}{/each}
	</div>
</fieldset>

<section class="edit" aria-labelledby="edit-h">
	<h3 id="edit-h">Cambiar «{main.name('es')}»</h3>
	<p>
		{main.template
			? 'Cambia tamaños y posiciones, colores, letra y bordes de tu plantilla.'
			: `Para cambiar tamaños y posiciones, colores, letra o bordes se crea una copia, «${main.name('es')} - copia», que pasa a ser la principal. La original no cambia.`}
	</p>
	<div class="row">
		<button type="button" class="primary" onclick={() => editor.editTemplate(main.id)}>Editar plantilla</button>
		{#if main.template}
			<button type="button" onclick={() => editor.duplicateTemplate(main.id)}>Duplicar</button>
			<button type="button" class="danger" onclick={remove}>Eliminar</button>
		{/if}
	</div>
</section>

<fieldset class="group">
	<legend class="group-label">Plantillas que pueden elegir los visitantes</legend>
	<p class="hint">Con más de una, la web muestra un selector en la barra de arriba y recuerda la elección de cada visitante.</p>
	<div class="checks">
		{#each [...own, ...builtIn] as look (look.id)}
			<label class="check">
				<input
					type="checkbox"
					checked={appearance.choices.includes(look.id)}
					disabled={appearance.theme === look.id}
					onchange={(e) => toggle(look.id, e.currentTarget.checked)}
				/>
				<span>{look.name('es')}{#if appearance.theme === look.id}{' '}<span class="main">(principal)</span>{/if}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	.group {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.group-label {
		padding: 0;
		margin-bottom: 2px;
		font-weight: 700;
		font-size: 15px;
	}
	.hint {
		margin: -4px 0 0;
		font-size: 13px;
		color: var(--muted);
	}
	.sub {
		margin: 4px 0 -2px;
		font-size: 13px;
		font-weight: 700;
		color: var(--muted);
	}
	.looks {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.look {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		cursor: pointer;
	}
	.look:hover {
		border-color: var(--ink);
	}
	.look.is-on {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}
	.look input {
		margin: 3px 0 0;
		width: 16px;
		height: 16px;
		flex: none;
		accent-color: var(--ink);
	}
	.sw {
		display: inline-flex;
		flex: none;
		margin-top: 2px;
	}
	.sw i {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.2);
	}
	.sw i + i {
		margin-left: -5px;
	}
	.txt {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.txt strong {
		font-size: 14px;
		color: var(--ink);
		overflow-wrap: anywhere;
	}
	.edit {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		border-radius: 10px;
		background: #fff;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.edit h3 {
		margin: 0;
		font-size: 15px;
		overflow-wrap: anywhere;
	}
	.edit p {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 4px;
	}
	.row button {
		min-height: 36px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.row button:hover {
		border-color: var(--ink);
	}
	.row .primary {
		border-color: var(--ink);
		background: var(--ink);
		color: #fff;
	}
	.row .danger {
		margin-left: auto;
		color: #8a1f14;
	}
	.row .danger:hover {
		border-color: #8a1f14;
	}
	.row button:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.checks {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 2px 12px;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		min-width: 0;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.check span {
		overflow-wrap: anywhere;
	}
	.check input {
		flex: none;
		width: 18px;
		height: 18px;
		accent-color: var(--ink);
	}
	.check:has(input:disabled) {
		cursor: default;
	}
	.main {
		font-weight: 400;
		color: var(--muted);
	}
</style>
