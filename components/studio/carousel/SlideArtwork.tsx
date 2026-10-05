"use client";

import {
  FOCUS_TO_CSS,
  SLIDE_CANVAS,
  overlayForStyle,
  type CarouselSlide,
  type ImageFocus,
  type OverlayVariant,
  type SlideStyle,
  type TextAnchor,
} from "@/lib/studio";

/**
 * One carousel slide as finished artwork.
 *
 * This component owns the entire visual design: the photograph is the canvas,
 * the words are typeset over it, and nothing here is conditional on the editor.
 * The editor renders this at true 1080 x 1350 and scales it down for the
 * screen, which is also exactly what gets exported — so the PNG and the
 * preview cannot drift apart.
 *
 * The model supplies content only. It never sends a colour, a gradient, a
 * position or any CSS.
 */

export type SlideArtworkProps = {
  slide: CarouselSlide;
  /** Resolved image URL for this slide, if one is assigned. */
  image?: string;
  imageTitle?: string;
  /** Shown as the cover kicker — the carousel format the creator chose. */
  typeLabel?: string;
};

function resolvedOverlay(slide: CarouselSlide): OverlayVariant {
  return slide.overlay === "auto" ? overlayForStyle(slide.anchor, slide.style) : slide.overlay;
}

export function SlideArtwork({ slide, image, imageTitle, typeLabel }: SlideArtworkProps) {
  const overlay = resolvedOverlay(slide);
  const focus: ImageFocus = slide.focus;
  const anchor: TextAnchor = slide.anchor;
  const style: SlideStyle = slide.style;

  return (
    <div
      className="slide"
      style={{
        width: SLIDE_CANVAS.width,
        height: SLIDE_CANVAS.height,
      }}
      data-slide-style={style}
      data-slide-type={slide.type}
      data-anchor={anchor}
    >
      {/* The photograph is the slide: full bleed, edge to edge, no frame. */}
      {image ? (
        <img
          className="slide-photo"
          src={image}
          alt={imageTitle || slide.title || ""}
          style={{ objectPosition: FOCUS_TO_CSS[focus] ?? FOCUS_TO_CSS.center }}
          crossOrigin="anonymous"
          decoding="async"
        />
      ) : (
        // No photograph assigned yet. A neutral ground rather than an invented
        // image; the editor warns about this outside the canvas.
        <div className="slide-photo slide-photo-empty" aria-hidden="true" />
      )}

      {/* Readability only — a gradient that leaves most of the photo visible. */}
      <div className={`slide-overlay slide-overlay-${overlay}`} aria-hidden="true" />

      {/* Photographic treatment differs per style; the photo stays dominant. */}
      {style === "cinematic" && <div className="slide-grade slide-grade-cinematic" aria-hidden="true" />}

      <div className="slide-type-grid">
        <div className="slide-type">
          {slide.type === "cover" && (
            <>
              {typeLabel && <p className="slide-kicker">{typeLabel}</p>}
              <h2 className="slide-display">{slide.title}</h2>
              {slide.subtitle && <p className="slide-standfirst">{slide.subtitle}</p>}
            </>
          )}

          {slide.type === "ingredients" && (
            <>
              <p className="slide-kicker">{slide.title || "What you’ll need"}</p>
              {slide.ingredients.length > 0 ? (
                <dl className="slide-ingredients">
                  {slide.ingredients.map((entry, index) => (
                    <div className="slide-ingredient" key={`${entry.amount}-${entry.ingredient}-${index}`}>
                      {entry.amount && <dt>{entry.amount}</dt>}
                      <dd>{entry.ingredient}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                slide.body && <p className="slide-body">{slide.body}</p>
              )}
            </>
          )}

          {slide.type === "method" && (
            <>
              <p className="slide-kicker">{slide.title || "How to make it"}</p>
              {slide.steps.length > 0 ? (
                <ol className="slide-steps">
                  {slide.steps.map((step, index) => (
                    <li className="slide-step" key={`${step.label}-${index}`}>
                      <span className="slide-step-label">{step.label}</span>
                      <span className="slide-step-text">{step.text}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                slide.body && <p className="slide-body">{slide.body}</p>
              )}
            </>
          )}

          {slide.type === "fact" && (
            <>
              {slide.title && <p className="slide-kicker">{slide.title}</p>}
              <p className="slide-statement">{slide.body || slide.subtitle}</p>
            </>
          )}

          {slide.type === "closing" && (
            <>
              <h2 className="slide-display">{slide.title}</h2>
              {slide.body && <p className="slide-standfirst">{slide.body}</p>}
              {slide.subtitle && <p className="slide-cta">{slide.subtitle}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}