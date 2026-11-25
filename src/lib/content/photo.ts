import { PHOTO_FRAME_DEFAULT, PHOTO_OFFSET_MAX, PHOTO_ZOOM, type PhotoFrame } from './types';

function clamp(value: unknown, min: number, max: number, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/** Encuadre válido aunque el contenido guardado venga incompleto o con valores fuera de rango. */
export function normalizeFrame(frame: Partial<PhotoFrame> | undefined | null): PhotoFrame {
	return {
		zoom: clamp(frame?.zoom, PHOTO_ZOOM.min, PHOTO_ZOOM.max, PHOTO_FRAME_DEFAULT.zoom),
		x: clamp(frame?.x, -PHOTO_OFFSET_MAX, PHOTO_OFFSET_MAX, PHOTO_FRAME_DEFAULT.x),
		y: clamp(frame?.y, -PHOTO_OFFSET_MAX, PHOTO_OFFSET_MAX, PHOTO_FRAME_DEFAULT.y)
	};
}

/** Transformación CSS de la foto dentro de su recuadro. */
export function frameTransform(frame: Partial<PhotoFrame> | undefined | null): string {
	const f = normalizeFrame(frame);
	return `translate(${f.x}%, ${f.y}%) scale(${f.zoom})`;
}
