"use client";

import { toPng } from "html-to-image";

import { SLIDE_CANVAS } from "@/lib/studio";

/**
 * PNG export for a single slide.
 *
 * The node handed in is always the real 1080 x 1350 artwork element — the
 * on-screen preview only scales it with a transform on a wrapper, so the
 * exported node is already at final size and needs no re-layout.
 */

const IMAGE_WAIT_TIMEOUT_MS = 8000;

/**
 * html-to-image draws whatever the browser has decoded so far, which silently
 * produces holes where an image is still loading. Wait for decode, but never
 * hang the export on one broken remote image.
 */
async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return;

  const pending = images
    .filter((image) => !(image.complete && image.naturalWidth > 0))
    .map(
      (image) =>
        new Promise<void>((resolve) => {
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        })
    );

  await Promise.race([
    Promise.all(pending),
    new Promise<void>((resolve) => setTimeout(resolve, IMAGE_WAIT_TIMEOUT_MS)),
  ]);
}

export async function slideToDataUrl(node: HTMLElement): Promise<string> {
  await waitForImages(node);

  return toPng(node, {
    width: SLIDE_CANVAS.width,
    height: SLIDE_CANVAS.height,
    // 1:1 — the node is already the export size, so scaling up here would only
    // invent detail.
    pixelRatio: 1,
    cacheBust: false,
    // The brand uses system serif and sans stacks, so there is no webfont to
    // inline and skipping the lookup keeps the export fast and reliable.
    skipFonts: true,
    style: {
      margin: "0",
      transform: "none",
      transformOrigin: "top left",
      boxShadow: "none",
    },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export type SlideExportTarget = {
  node: HTMLElement;
  filename: string;
};

/** Exports one slide at a time: 1080 x 1350 PNGs, artwork only. */
export async function exportSlides(
  targets: SlideExportTarget[],
  onProgress?: (done: number, total: number) => void
): Promise<{ exported: number; failed: number }> {
  let exported = 0;
  let failed = 0;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];

    try {
      const dataUrl = await slideToDataUrl(target.node);
      downloadDataUrl(dataUrl, target.filename);
      exported += 1;
    } catch {
      // A single slide that will not render must not abandon the rest.
      failed += 1;
    }

    onProgress?.(index + 1, targets.length);

    // Give the browser a frame between downloads so it does not throttle them.
    if (index < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  return { exported, failed };
}