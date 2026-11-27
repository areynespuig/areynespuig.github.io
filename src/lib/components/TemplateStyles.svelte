<script lang="ts">
	import { templateCss, type TemplateDef } from '../content/templates';

	/**
	 * Variables CSS de las plantillas propias, en una etiqueta <style> de la cabecera. Solo contienen
	 * opciones de listas cerradas y números acotados (normalizeTemplates), así que no hay nada que escapar.
	 */
	let { templates }: { templates: TemplateDef[] } = $props();

	const css = $derived(templates.map(templateCss).join(''));
</script>

<svelte:head>
	{#if css}{@html `<style>${css}</style>`}{/if}
</svelte:head>
