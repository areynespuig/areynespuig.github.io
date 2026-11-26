<script lang="ts">
	import { LANGS, type Lang } from '../content/types';
	import { LANG_NAMES } from '../i18n';
	import type { Editor, FieldStatus } from './editor.svelte';
	import type { FieldDef, TargetInfo } from './schema';
	import ImageFramer from './ImageFramer.svelte';

	let { editor, info, field }: { editor: Editor; info: TargetInfo; field: FieldDef } = $props();

	const STATUS: Record<FieldStatus, string> = {
		missing: 'Falta',
		review: 'Revisar',
		changed: 'Sin publicar',
		ok: 'Al día',
		empty: 'Opcional'
	};

	const base = $derived(`f-${info.target.replace(/[^a-z0-9]+/gi, '-')}-${field.key}`);
	let fileInput = $state<HTMLInputElement>();

	function listValue(lang: Lang): string {
		return ((info.obj[field.key] as Record<Lang, string[]>)[lang] ?? []).join('\n');
	}
	function rows(text: string, long: boolean): number {
		if (!long) return 2;
		return Math.min(8, Math.max(3, Math.ceil(text.length / 48)));
	}
	function fileName(path: string): string {
		return path ? (editor.pending[path]?.name ?? path.split('/').pop() ?? path) : '';
	}
</script>

{#if field.type === 'l10n' || field.type === 'l10nList'}
	<fieldset class="group">
		<legend class={info.single ? 'visually-hidden' : 'group-label'}>{field.label}</legend>
		{#if field.hint}<p class="hint">{field.hint}</p>{/if}
		{#each LANGS as lang (lang)}
			{@const status = editor.status(info, field.key, lang)}
			{@const value = field.type === 'l10nList' ? listValue(lang) : (info.obj[field.key][lang] as string)}
			<div class="lang-field">
				<div class="lang-head">
					<label for={`${base}-${lang}`}>{LANG_NAMES[lang]}</label>
					{#if lang === editor.lang}<span class="tag">En la vista</span>{/if}
					<span class={['chip', status]}>{STATUS[status]}</span>
				</div>
				<textarea
					id={`${base}-${lang}`}
					lang={lang}
					class={[lang === editor.lang && 'in-view']}
					rows={field.type === 'l10nList' ? 7 : rows(value, !!(field.type === 'l10n' && field.long))}
					{value}
					placeholder={`Escribe el texto en ${LANG_NAMES[lang].toLowerCase()}`}
					oninput={(e) =>
						field.type === 'l10nList'
							? editor.setList(info, field.key, lang, e.currentTarget.value)
							: editor.setText(info, field.key, lang, e.currentTarget.value)}
				></textarea>
				{#if status === 'review'}
					<div class="review">
						<span>Otro idioma cambió después de esta versión.</span>
						<button type="button" class="link" onclick={() => editor.accept(info, field.key, lang)}>Está bien así</button>
					</div>
				{/if}
			</div>
		{/each}
	</fieldset>
{:else if field.type === 'text' || field.type === 'url'}
	<div class="single">
		<label for={base}>{field.label}</label>
		<input
			id={base}
			type={field.type === 'url' ? 'url' : 'text'}
			value={info.obj[field.key] ?? ''}
			placeholder={field.placeholder ?? ''}
			oninput={(e) => editor.setValue(info, field.key, e.currentTarget.value)}
		/>
	</div>
{:else if field.type === 'year'}
	<div class="single">
		<label for={base}>{field.label}</label>
		<input
			id={base}
			class="year"
			type="number"
			inputmode="numeric"
			min="1990"
			max="2100"
			value={info.obj[field.key] ?? ''}
			disabled={field.key === 'end' && info.obj.ongoing}
			placeholder={field.key === 'end' && info.obj.ongoing ? 'En curso' : 'Año'}
			oninput={(e) => {
				const v = e.currentTarget.value;
				editor.setValue(info, field.key, v === '' ? null : Number(v));
			}}
		/>
	</div>
{:else if field.type === 'bool'}
	<label class="check">
		<input
			type="checkbox"
			checked={!!info.obj[field.key]}
			onchange={(e) => editor.setValue(info, field.key, e.currentTarget.checked)}
		/>
		{field.label}
	</label>
{:else if field.type === 'choice'}
	<fieldset class="group">
		<legend class="group-label">{field.label}</legend>
		<div class="choices">
			{#each field.options as option (option.value)}
				<label class={['choice', info.obj[field.key] === option.value && 'is-on']}>
					<input
						type="radio"
						name={base}
						value={option.value}
						checked={info.obj[field.key] === option.value}
						onchange={() => editor.setValue(info, field.key, option.value)}
					/>
					<span>
						<strong>{option.label}</strong>
						<span>{option.hint}</span>
					</span>
				</label>
			{/each}
		</div>
	</fieldset>
{:else if field.type === 'imageFrame'}
	<ImageFramer {editor} {info} frameKey={field.key} imageKey={field.image} label={field.label} />
{:else if field.type === 'image' || field.type === 'pdf'}
	<div class="single">
		<span class="label" id={`${base}-label`}>{field.label}</span>
		<div class="file">
			{#if field.type === 'image'}
				{#if info.obj[field.key]}
					<img src={editor.asset(info.obj[field.key])} alt="" />
				{:else}
					<span class="thumb-empty">Sin imagen</span>
				{/if}
			{:else}
				<span class="pdf" aria-hidden="true">PDF</span>
			{/if}
			<div class="file-meta">
				<strong>{fileName(info.obj[field.key]) || 'Ningún archivo'}</strong>
				{#if editor.pending[info.obj[field.key]]}<span>Se subirá al publicar</span>{/if}
				{#if field.hint}<span>{field.hint}</span>{/if}
			</div>
			<button type="button" class="btn" aria-describedby={`${base}-label`} onclick={() => fileInput?.click()}>
				{field.type === 'image' ? (info.obj[field.key] ? 'Cambiar imagen' : 'Subir imagen') : 'Subir otro PDF'}
			</button>
			<input
				bind:this={fileInput}
				type="file"
				class="visually-hidden"
				tabindex="-1"
				aria-hidden="true"
				accept={field.type === 'image' ? 'image/png,image/jpeg,image/webp,image/avif,image/svg+xml' : 'application/pdf'}
				onchange={(e) => {
					const file = e.currentTarget.files?.[0];
					if (file) editor.upload(info, field.key, file);
					e.currentTarget.value = '';
				}}
			/>
		</div>
	</div>
{/if}

<style>
	.group {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.group-label {
		font-weight: 700;
		font-size: 15px;
		padding: 0;
		margin-bottom: 2px;
	}
	.hint {
		margin: -6px 0 0;
		font-size: 13px;
		color: var(--muted);
	}
	.lang-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.lang-head {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.lang-head label,
	.single > label,
	.label {
		font-weight: 600;
	}
	.tag {
		font-size: 12px;
		color: var(--muted);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 1px 8px;
		background: #fff;
	}
	.chip {
		margin-left: auto;
		font-size: 12px;
		font-weight: 600;
		border-radius: 999px;
		padding: 2px 8px;
	}
	.chip.ok,
	.chip.empty {
		color: var(--muted);
		padding-right: 0;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.choice {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		cursor: pointer;
	}
	.choice:hover {
		border-color: var(--ink);
	}
	.choice.is-on {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}
	.choice input {
		margin: 3px 0 0;
		width: 16px;
		height: 16px;
		flex: none;
		accent-color: var(--ink);
	}
	.choice > span {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 13px;
		color: var(--muted);
	}
	.choice strong {
		font-size: 14px;
		color: var(--ink);
	}
	.chip.review {
		background: #fff1c7;
		color: #5e4300;
	}
	.chip.missing {
		background: #fce3e0;
		color: #8a1f14;
	}
	.chip.changed {
		background: #e3e8f7;
		color: #24366e;
	}
	textarea,
	input:not([type='checkbox']):not([type='file']):not([type='radio']) {
		width: 100%;
		font: inherit;
		font-size: 14px;
		line-height: 1.5;
		color: var(--ink);
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 9px 11px;
	}
	textarea {
		resize: vertical;
		field-sizing: content;
		min-height: 3lh;
	}
	textarea.in-view {
		border-color: #9ca2b3;
	}
	textarea:focus,
	input:focus {
		outline: 2px solid var(--ink);
		outline-offset: 0;
		border-color: var(--ink);
	}
	input:disabled {
		background: #eef0f3;
		color: var(--muted);
	}
	.year {
		max-width: 9rem;
	}
	.review {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 2px 10px;
		font-size: 13px;
		color: #5e4300;
	}
	.link {
		appearance: none;
		border: 0;
		background: none;
		padding: 6px 0;
		font: inherit;
		font-weight: 600;
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.single {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		font-weight: 600;
		cursor: pointer;
	}
	.check input {
		width: 18px;
		height: 18px;
		accent-color: var(--ink);
	}
	.file {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.file img,
	.thumb-empty {
		width: 64px;
		height: 64px;
		border-radius: 8px;
		object-fit: cover;
		background: #fff;
		border: 1px solid var(--line);
	}
	.thumb-empty {
		display: grid;
		place-items: center;
		font-size: 11px;
		color: var(--muted);
		text-align: center;
	}
	.pdf {
		width: 48px;
		height: 60px;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: #fff;
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 700;
		color: #8a1f14;
	}
	.file-meta {
		flex: 1 1 8rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
		font-size: 13px;
		color: var(--muted);
		overflow-wrap: anywhere;
	}
	.file-meta strong {
		color: var(--ink);
		font-size: 14px;
	}
	.btn {
		appearance: none;
		min-height: 40px;
		padding: 0 14px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: #fff;
		color: var(--ink);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.btn:hover {
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
