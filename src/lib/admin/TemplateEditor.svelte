<script lang="ts">
	import {
		COLORS,
		CONTROLS,
		FONTS,
		GROUPS,
		NAME_MAX,
		type ChoiceControl,
		type ColorKey,
		type Control,
		type RangeControl
	} from '../content/templates';
	import { THEMES } from '../content/themes';
	import type { Editor } from './editor.svelte';

	/** Panel de la derecha mientras se edita una plantilla propia: su nombre y sus opciones por grupos. */
	let { editor }: { editor: Editor } = $props();

	const tpl = $derived(editor.editingTemplate!);
	const base = $derived(THEMES[tpl.base]);
	const twoModes = $derived(base.schemes.length > 1);
	/** Modo cuyos colores se editan: el de la vista previa (o el único que tiene la plantilla). */
	const mode = $derived<'light' | 'dark'>(twoModes ? editor.scheme : base.schemes[0]);
	const group = $derived(GROUPS.find((g) => g.id === editor.templateGroup)!);
	const controls = $derived(CONTROLS.filter((c) => c.group === editor.templateGroup && !irrelevant(c)));
	const groupChanged = $derived(
		editor.templateGroup === 'colors'
			? COLORS.some(({ key }) => tpl.colors[key])
			: CONTROLS.some((c) => c.group === editor.templateGroup && tpl.values[c.key] !== undefined)
	);

	/** Opciones que no hacen nada con lo elegido en otra (p. ej., la altura de la foto si va encima). */
	function irrelevant(c: Control): boolean {
		const photo = tpl.values.photo;
		if (c.key === 'photoAlign') return photo === 'top' || photo === 'none';
		if (c.key === 'photoScale') return photo === 'none';
		if (c.key === 'headWidth') return tpl.values.heads === 'top';
		return false;
	}

	// Lo que se ve ahora en la vista previa: los valores de la plantilla original, o los ya cambiados.
	interface Seen {
		vars: Record<string, string>;
		colors: Record<string, { light: string; dark: string }>;
	}
	let seen = $state<Seen | null>(null);
	const READS = CONTROLS.flatMap((c) => (c.kind === 'font' ? [c.reads] : c.kind === 'range' && c.reads ? [c.reads] : []));

	let paint: CanvasRenderingContext2D | null = null;
	/** Cualquier color de CSS (rgb, oklch…) en #rrggbb, que es lo que entiende el selector de color. */
	function toHex(color: string): string {
		paint ??= document.createElement('canvas').getContext('2d');
		if (!paint) return '#000000';
		paint.fillStyle = '#000000';
		paint.fillStyle = color;
		const value = String(paint.fillStyle);
		if (value.startsWith('#')) return value;
		const parts = value.match(/[\d.]+/g) ?? [];
		return `#${parts
			.slice(0, 3)
			.map((n) => Math.round(Number(n)).toString(16).padStart(2, '0'))
			.join('')}`;
	}

	function readPreview(): Seen | null {
		const site = document.querySelector<HTMLElement>('.site.editing');
		if (!site) return null;
		const style = getComputedStyle(site);
		const vars = Object.fromEntries(READS.map((v) => [v, style.getPropertyValue(v).trim()]));
		// Un elemento de prueba dentro de la web lee cada color en modo claro y en oscuro.
		const probe = document.createElement('i');
		probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none';
		site.append(probe);
		const colors: Seen['colors'] = {};
		for (const { key } of COLORS) {
			const read = (scheme: 'light' | 'dark') => {
				probe.style.colorScheme = scheme;
				probe.style.backgroundColor = `var(--${key})`;
				return toHex(getComputedStyle(probe).backgroundColor);
			};
			colors[key] = { light: read('light'), dark: read('dark') };
		}
		probe.remove();
		return { vars, colors };
	}

	$effect(() => {
		// Se vuelve a leer cuando cambia algo de la plantilla o el modo de la vista previa.
		JSON.stringify(tpl);
		void editor.scheme;
		const frame = requestAnimationFrame(() => (seen = readPreview()));
		return () => cancelAnimationFrame(frame);
	});

	let nameInput = $state<HTMLInputElement>();
	$effect(() => {
		// Recién creada («Bruto - copia»): el cursor queda en el nombre, listo para cambiarlo.
		if (nameInput && editor.justCreated === tpl.id) {
			nameInput.focus();
			nameInput.select();
			editor.justCreated = null;
		}
	});

	function rangeValue(c: RangeControl): number {
		const v = tpl.values[c.key];
		if (typeof v === 'number') return v;
		if (c.base !== undefined) return c.base;
		const read = parseFloat(seen?.vars[c.reads ?? ''] ?? '');
		return Number.isFinite(read) ? Math.min(c.max, Math.max(c.min, read)) : c.min;
	}
	function rangeText(c: RangeControl, v: number): string {
		if (c.key === 'radiusBtn' && v >= c.max) return 'redondas';
		return c.unit ? `${String(v).replace('.', ',')} ${c.unit}` : String(v);
	}
	function choiceValue(c: ChoiceControl): string {
		const v = tpl.values[c.key];
		return typeof v === 'string' ? v : c.options[0].value;
	}
	/** La primera opción es la de la plantilla original: elegirla es quitar el cambio. */
	function choose(c: ChoiceControl, value: string) {
		if (value === c.options[0].value) delete tpl.values[c.key];
		else tpl.values[c.key] = value;
	}
	function fontValue(key: string, reads: string): string {
		const v = tpl.values[key];
		if (typeof v === 'string') return v;
		return (seen?.vars[reads] ?? '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
	}

	function colorValue(key: ColorKey): string {
		return tpl.colors[key]?.[mode] ?? seen?.colors[key]?.[mode] ?? '#000000';
	}
	/** En las plantillas con dos modos se guardan los dos: el que se edita y el otro tal como se ve. */
	function setColor(key: ColorKey, hex: string) {
		if (!twoModes) {
			tpl.colors[key] = { [mode]: hex };
			return;
		}
		const before = tpl.colors[key];
		const now = seen?.colors[key];
		tpl.colors[key] = {
			light: mode === 'light' ? hex : (before?.light ?? now?.light),
			dark: mode === 'dark' ? hex : (before?.dark ?? now?.dark)
		};
	}

	function resetGroup() {
		if (editor.templateGroup === 'colors') {
			for (const { key } of COLORS) delete tpl.colors[key];
			return;
		}
		for (const c of CONTROLS) if (c.group === editor.templateGroup) delete tpl.values[c.key];
	}
</script>

<div class="head">
	<p class="sec">Plantilla propia, a partir de {base.name.es}</p>
	<h2 id="insp-title">Editar plantilla</h2>
	<label class="name">
		<span>Nombre</span>
		<input
			bind:this={nameInput}
			value={tpl.name}
			maxlength={NAME_MAX}
			autocomplete="off"
			oninput={(e) => editor.renameTemplate(tpl.id, e.currentTarget.value)}
			onblur={() => editor.tidyTemplateName(tpl.id)}
		/>
	</label>
	<button type="button" class="done" onclick={() => editor.finishTemplate()}>Terminar de editar</button>
</div>

<div class="groups" role="group" aria-label="Qué quieres cambiar">
	{#each GROUPS as g (g.id)}
		<button type="button" aria-pressed={editor.templateGroup === g.id} onclick={() => (editor.templateGroup = g.id)}>{g.label}</button>
	{/each}
</div>

<section class="opts" aria-labelledby="opts-h">
	<h3 id="opts-h">{group.label}</h3>

	{#if editor.templateGroup === 'colors'}
		<p class="note">
			{twoModes
				? `Colores del modo ${mode === 'dark' ? 'oscuro' : 'claro'}. Para cambiar los del otro, elige su modo arriba, en «Modo».`
				: `Esta plantilla solo tiene modo ${mode === 'dark' ? 'oscuro' : 'claro'}.`}
		</p>
		{#each COLORS as c (c.key)}
			<div class="ctl color">
				<input id={`c-${c.key}`} type="color" value={colorValue(c.key)} oninput={(e) => setColor(c.key, e.currentTarget.value)} />
				<label for={`c-${c.key}`}>{c.label}</label>
				{#if tpl.colors[c.key]}
					<button type="button" class="reset" onclick={() => delete tpl.colors[c.key]}>Restablecer</button>
				{/if}
			</div>
		{/each}
	{:else}
		{#if editor.templateGroup === 'hero'}
			<p class="note">En el móvil, la foto siempre va encima del texto.</p>
		{/if}
		{#each controls as c (c.key)}
			{#if c.kind === 'range'}
				{@const v = rangeValue(c)}
				<div class="ctl">
					<div class="ctl-head">
						<label for={`r-${c.key}`}>{c.label}</label>
						<output for={`r-${c.key}`}>{rangeText(c, v)}</output>
					</div>
					<input
						id={`r-${c.key}`}
						type="range"
						min={c.min}
						max={c.max}
						step={c.step}
						value={v}
						oninput={(e) => (tpl.values[c.key] = Number(e.currentTarget.value))}
					/>
					{#if tpl.values[c.key] !== undefined}
						<button type="button" class="reset" onclick={() => delete tpl.values[c.key]}>Restablecer</button>
					{/if}
				</div>
			{:else if c.kind === 'choice'}
				{@const v = choiceValue(c)}
				<fieldset class="ctl">
					<legend>{c.label}</legend>
					<div class="seg">
						{#each c.options as o (o.value)}
							<button type="button" aria-pressed={v === o.value} onclick={() => choose(c, o.value)}>{o.label}</button>
						{/each}
					</div>
				</fieldset>
			{:else}
				<div class="ctl">
					<label for={`f-${c.key}`}>{c.label}</label>
					<select
						id={`f-${c.key}`}
						value={fontValue(c.key, c.reads)}
						onchange={(e) => (tpl.values[c.key] = e.currentTarget.value)}
					>
						{#each FONTS as f (f.family)}
							<option value={f.family}>{f.label}</option>
						{/each}
					</select>
					{#if tpl.values[c.key] !== undefined}
						<button type="button" class="reset" onclick={() => delete tpl.values[c.key]}>Restablecer</button>
					{/if}
				</div>
			{/if}
		{/each}
	{/if}

	{#if groupChanged}
		<button type="button" class="reset-all" onclick={resetGroup}>Dejar «{group.label}» como en {base.name.es}</button>
	{/if}
</section>

<p class="hint">
	Haz clic en una parte de la vista previa (la portada, una sección o una tarjeta) para ver sus opciones. Los cambios se
	publican con el resto de la web.
</p>

<style>
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
	}
	.name {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 12px;
		font-size: 14px;
		font-weight: 700;
	}
	.name input,
	select {
		min-height: 40px;
		padding: 0 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-size: 15px;
		font-weight: 400;
	}
	.name input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	input[type='range']:focus-visible,
	input[type='color']:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.done {
		align-self: flex-start;
		margin-top: 10px;
		min-height: 38px;
		padding: 0 14px;
		border: 0;
		border-radius: 8px;
		background: var(--ink);
		color: #fff;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.groups {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.groups button,
	.seg button {
		min-height: 34px;
		padding: 0 11px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.groups button:hover,
	.seg button:hover {
		border-color: var(--ink);
	}
	.groups button[aria-pressed='true'],
	.seg button[aria-pressed='true'] {
		border-color: var(--ink);
		background: var(--ink);
		color: #fff;
	}
	.opts {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	h3 {
		margin: 0;
		font-size: 16px;
	}
	.note {
		margin: -6px 0 0;
		font-size: 13px;
		color: var(--muted);
	}
	.ctl {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: 0;
		border: 0;
		font-size: 14px;
	}
	.ctl label,
	.ctl legend {
		padding: 0;
		font-weight: 600;
	}
	.ctl legend {
		margin-bottom: 6px;
	}
	.ctl-head {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	output {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	input[type='range'] {
		width: 100%;
		margin: 0;
		accent-color: var(--ink);
	}
	.seg {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.ctl.color {
		flex-direction: row;
		align-items: center;
		gap: 10px;
	}
	.ctl.color label {
		flex: 1;
		font-weight: 500;
	}
	input[type='color'] {
		flex: none;
		width: 40px;
		height: 32px;
		padding: 2px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: #fff;
		cursor: pointer;
	}
	.reset,
	.reset-all {
		align-self: flex-start;
		padding: 0;
		border: 0;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.reset:hover,
	.reset-all:hover {
		color: var(--ink);
	}
	.hint {
		margin: auto 0 0;
		padding-top: 14px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		color: var(--muted);
	}
</style>
