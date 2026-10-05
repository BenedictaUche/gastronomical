import { SLIDE_CANVAS } from "@/lib/studio";

/**
 * Slide artwork is always drawn through the same-origin proxy.
 *
 * Canvas export taints on any cross-origin image without CORS headers, which is
 * exactly what Google Images thumbnails are — the exported PNG would come out
 * with holes in it. Routing the preview through the proxy as well keeps one URL
 * in the DOM for both the screen and the export. The proxy caches for a day, so
 * re-rendering a slide costs nothing.
 */
export function slideImageUrl(src: string | undefined): string {
  const value = (src || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) return value;

  return `/api/carousel/image?src=${encodeURIComponent(value)}`;
}

/** The URL that gets written to disk, before proxying. */
export function displayImageUrl(src: string | undefined): string {
  return (src || "").trim();
}

export const PREVIEW_MIN_WIDTH = 190;
export const PREVIEW_MAX_WIDTH = 400;

/** Room the control panel needs before the preview column gives any up. */
export const PANEL_MIN_WIDTH = 430;
export const STAGE_GAP = 26;

/**
 * Scale factor for the 1080 x 1350 artwork inside the editor's preview column.
 * The slide itself is never resized — only this transform — so what is measured
 * on screen is what gets exported.
 */
export function scaleForWidth(listWidth: number): number {
  const available = Math.max(PREVIEW_MIN_WIDTH, listWidth - PANEL_MIN_WIDTH - STAGE_GAP);
  const stageWidth = Math.min(PREVIEW_MAX_WIDTH, available);

  return Math.max(0.16, Math.min(1, stageWidth / SLIDE_CANVAS.width));
}