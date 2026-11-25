<script lang="ts">
	import { frameTransform, normalizeFrame } from '../content/photo';
	import { PHOTO_OFFSET_MAX, PHOTO_ZOOM, type PhotoFrame } from '../content/types';
	import type { Editor } from './editor.svelte';
	import type { TargetInfo } from './schema';

	let {
		editor,
		info,
		frameKey,
		imageKey,
		label
	}: { editor: Editor; info: TargetInfo; frameKey: string; imageKey: string; label: string } = $props();

	const frame = $derived(normalizeFrame(info.obj[frameKey]));
	const src = $derived(editor.asset(info.obj[imageKey] ?? ''));
	const id = $derived(`frame-${info.target.replace(/[^a-z0-9]+/gi, '-')}`);

	let box = $state<HTMLButtonElement>();
	let drag = $state<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);

	function set(next: Partial<PhotoFrame>) {
		const f = normalizeFrame({ ...frame, ...next });
		editor.setValue(info, frameKey, {
			zoom: Math.round(f.zoom * 100) / 100,
			x: Math.round(f.x * 10) / 10,
			y: Math.round(f.y * 10) / 10
		});
	}

	function reset() {
		editor.setValue(info, frameKey, undefined);
	}

	// Arrastrar mueve la imagen exactamente lo mismo que el puntero.
	function onpointerdown(event: PointerEvent) {
		if (!box || event.button !== 0) return;
		box.setPointerCapture(event.pointerId);
		const rect = box.getBoundingClientRect();
		drag = { px: event.clientX, py: event.clientY, x: frame.x, y: frame.y, w: rect.width, h: rect.height };
	}
	function onpointermove(event: PointerEvent) {
		if (!drag) return;
		set({
			x: drag.x + ((event.clientX - drag.px) / drag.w) * 100,
			y: drag.y + ((event.clientY - drag.py) / drag.h) * 100
		});
	}
	function onpointerup() {
		drag = null;
	}

	function onkeydown(event: KeyboardEvent) {
		const step = event.shiftKey ? 10 : 2;
		const moves: Record<string, Partial<PhotoFrame>> = {
			ArrowLeft: { x: frame.x - step },
			ArrowRight: { x: frame.x + step },
			ArrowUp: { y: frame.y - step },
			ArrowDown: { y: frame.y + step },
			'+': { zoom: frame.zoom + 0.1 },
			'=': { zoom: frame.zoom + 0.1 },
			'-': { zoom: frame.zoom - 0.1 }
		};
		const next = moves[event.key];
		if (next) {
			event.preventDefault();
			set(next);
		}
	}

	// La rueda del ratón acerca y aleja (necesita un listener no pasivo para no desplazar el panel).
	$effect(() => {
		const el = box;
		if (!el) return;
		const onwheel = (event: WheelEvent) => {
			event.preventDefault();
			set({ zoom: frame.zoom - Math.sign(event.deltaY) * 0.05 });
		};
		el.addEventListener('wheel', onwheel, { passive: false });
		return () => el.removeEventListener('wheel', onwheel);
	});
</script>

<div class="framer">
	<span class="label" id={`${id}-label`}>{label}</span>
	<div class="stage">
		<button
			bind:this={box}
			type="button"
			class={['crop', drag && 'is-dragging']}
			aria-labelledby={`${id}-label`}
			aria-describedby={`${id}-help`}
			{onpointerdown}
			{onpointermove}
			{onpointerup}
			onpointercancel={onpointerup}
			{onkeydown}
		>
			{#if src}
				<img {src} alt="" draggable="false" style:transform={frameTransform(frame)} />
			{:else}
				<span class="empty">Sin imagen</span>
			{/if}
		</button>
		<p class="help" id={`${id}-help`}>
			Arrastra la foto para moverla dentro del recuadro y usa la rueda del ratón para acercarla o alejarla. Con el teclado: flechas para
			mover, + y − para el zoom.
		</p>
	</div>

	<label class="range">
		<span>Zoom</span>
		<input
			type="range"
			min={PHOTO_ZOOM.min}
			max={PHOTO_ZOOM.max}
			step="0.05"
			value={frame.zoom}
			oninput={(e) => set({ zoom: Number(e.currentTarget.value) })}
		/>
		<output>{Math.round(frame.zoom * 100)} %</output>
	</label>
	<label class="range">
		<span>Horizontal</span>
		<input
			type="range"
			min={-PHOTO_OFFSET_MAX}
			max={PHOTO_OFFSET_MAX}
			step="1"
			value={frame.x}
			oninput={(e) => set({ x: Number(e.currentTarget.value) })}
		/>
		<output>{Math.round(frame.x)}</output>
	</label>
	<label class="range">
		<span>Vertical</span>
		<input
			type="range"
			min={-PHOTO_OFFSET_MAX}
			max={PHOTO_OFFSET_MAX}
			step="1"
			value={frame.y}
			oninput={(e) => set({ y: Number(e.currentTarget.value) })}
		/>
		<output>{Math.round(frame.y)}</output>
	</label>
	<button type="button" class="btn" onclick={reset} disabled={frame.zoom === 1 && frame.x === 0 && frame.y === 0}>
		Restablecer encuadre
	</button>
</div>

<style>
	.framer {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.label {
		font-weight: 600;
	}
	.stage {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.crop {
		appearance: none;
		border: 0;
		padding: 0;
		margin: 0;
		display: block;
		flex: none;
		width: 132px;
		max-height: calc(132px * 1.75);
		border-radius: 10px;
		overflow: hidden;
		background: #c9d0f2;
		cursor: grab;
		touch-action: none;
		user-select: none;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.crop.is-dragging {
		cursor: grabbing;
	}
	.crop:focus-visible {
		outline: 3px solid var(--ink);
		outline-offset: 2px;
	}
	/* Misma proporción que la foto, igual que el recuadro de la web. */
	.crop img {
		display: block;
		width: 100%;
		height: auto;
		pointer-events: none;
	}
	.empty {
		display: grid;
		place-items: center;
		aspect-ratio: 4 / 5;
		font-size: 12px;
		color: var(--muted);
	}
	.help {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.range {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr) 3.5rem;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}
	.range input {
		width: 100%;
		accent-color: var(--ink);
	}
	.range output {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	.btn {
		align-self: flex-start;
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
	.btn:hover:not(:disabled) {
		border-color: var(--ink);
	}
	.btn:disabled {
		opacity: 0.45;
		cursor: default;
	}
</style>
