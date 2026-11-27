<script lang="ts">
	import { THEME_IDS, THEMES, normalizeAppearance, type ThemeId } from '../content/themes';
	import type { Editor } from './editor.svelte';
	import type { TargetInfo } from './schema';

	/** Apariencia de la web: el tema principal y los que pueden elegir los visitantes. */
	let { editor, info }: { editor: Editor; info: TargetInfo } = $props();

	const appearance = $derived(normalizeAppearance(info.obj));

	/** El tema principal nuevo sustituye al anterior entre los elegibles; el resto se mantiene. */
	function setMain(id: ThemeId) {
		const others = appearance.choices.filter((c) => c !== appearance.theme);
		editor.setValue(info, 'theme', id);
		editor.setValue(info, 'choices', normalizeAppearance({ theme: id, choices: [...others, id] }).choices);
	}
	function toggle(id: ThemeId, on: boolean) {
		const next = on ? [...appearance.choices, id] : appearance.choices.filter((c) => c !== id);
		editor.setValue(info, 'choices', normalizeAppearance({ theme: appearance.theme, choices: next }).choices);
	}
</script>

<fieldset class="group">
	<legend class="group-label">Tema principal</legend>
	<p class="hint">Es el que ve cualquiera que entra en la web. La vista previa cambia al momento.</p>
	<div class="looks">
		{#each THEME_IDS as id (id)}
			<label class={['look', appearance.theme === id && 'is-on']}>
				<input type="radio" name="look-main" checked={appearance.theme === id} onchange={() => setMain(id)} />
				<span class="sw" aria-hidden="true">
					{#each THEMES[id].swatches as color, i (i)}<i style:background={color}></i>{/each}
				</span>
				<span class="txt">
					<strong>{THEMES[id].name.es}</strong>
					<span>{THEMES[id].hint}</span>
				</span>
			</label>
		{/each}
	</div>
</fieldset>

<fieldset class="group">
	<legend class="group-label">Temas que pueden elegir los visitantes</legend>
	<p class="hint">Con más de uno, la web muestra un selector de tema en la barra de arriba y recuerda la elección de cada visitante.</p>
	<div class="checks">
		{#each THEME_IDS as id (id)}
			<label class="check">
				<input
					type="checkbox"
					checked={appearance.choices.includes(id)}
					disabled={appearance.theme === id}
					onchange={(e) => toggle(id, e.currentTarget.checked)}
				/>
				{THEMES[id].name.es}{#if appearance.theme === id}<span class="main"> (principal)</span>{/if}
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
		font-size: 13px;
		color: var(--muted);
	}
	.txt strong {
		font-size: 14px;
		color: var(--ink);
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
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.check input {
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
