import { getContext, setContext } from 'svelte';
import type { CollectionKey } from '../content/types';

/**
 * Lo que la web necesita saber cuando se muestra dentro del editor.
 * En la web pública no hay contexto y todo se pinta como texto normal.
 */
export interface EditorBridge {
	isSelected(target: string): boolean;
	isFlagged(target: string): boolean;
	select(target: string): void;
	add(collection: CollectionKey): void;
	asset(src: string): string;
}

const KEY = Symbol('portfolio-editor');

export function provideEditor(bridge: EditorBridge) {
	setContext(KEY, bridge);
}

export function useEditor(): EditorBridge | undefined {
	return getContext<EditorBridge | undefined>(KEY);
}
