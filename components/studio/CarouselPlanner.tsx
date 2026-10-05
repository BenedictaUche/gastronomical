"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clipboard,
  Download,
  ImageOff,
  ImagePlus,
  ListOrdered,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  CAROUSEL_TYPES,
  IMAGE_FOCUSES,
  OVERLAY_VARIANTS,
  SLIDE_CANVAS,
  SLIDE_LAYOUT_OPTIONS,
  SLIDE_STYLES,
  TEXT_ANCHORS,
  carouselTypeLabel,
  downloadText,
  pad,
  slugify,
  suggestAnchor,
  type CarouselSlide,
  type ImageFocus,
  type OverlayVariant,
  type ResearchImage,
  type ResearchPack,
  type SlideIngredient,
  type SlideLayout,
  type SlideStyle,
  type TextAnchor,
} from "@/lib/studio";
import { SlideArtwork } from "./carousel/SlideArtwork";
import { displayImageUrl, scaleForWidth, slideImageUrl } from "./carousel/slideImages";
import { exportSlides } from "./carousel/slideExport";

type CarouselPlannerProps = {
  hasSession: boolean;
  dish: string;
  context: string;
  pack: ResearchPack;
  images: ResearchImage[];
  model: string;
  title: string;
  slides: CarouselSlide[];
  type: string;
  generating: boolean;
  regeneratingIndex: number | null;
  error: string | null;
  copied: boolean;
  carouselSaved: boolean;
  onTypeChange: (id: string) => void;
  onGenerate: () => void;
  onRegenerateSlide: (index: number) => void;
  onTitleChange: (title: string) => void;
  onSlidesChange: (slides: CarouselSlide[]) => void;
  onCopy: () => void;
  onSaveCarousel: () => void;
  onGoStart: () => void;
};

export function CarouselPlanner({
  hasSession,
  dish,
  context,
  pack,
  images,
  model,
  title,
  slides,
  type,
  generating,
  regeneratingIndex,
  error,
  copied,
  carouselSaved,
  onTypeChange,
  onGenerate,
  onRegenerateSlide,
  onTitleChange,
  onSlidesChange,
  onCopy,
  onSaveCarousel,
  onGoStart,
}: CarouselPlannerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState(300);

  // One ref per slide so the exporter can read the real 1080 x 1350 node.
  const stageRefs = useRef(new Map<string, HTMLDivElement>());
  const listRef = useRef<HTMLDivElement>(null);

  const setStageRef = useCallback(
    (id: string, node: HTMLDivElement | null) => {
      if (node) stageRefs.current.set(id, node);
      else stageRefs.current.delete(id);
    },
    []
  );

  // The artwork is always rendered at full size and only scaled for the screen,
  // so the editor must know how much room the preview column actually has.
  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) return;

    const measure = () => setPreviewWidth(node.clientWidth);
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasSession, slides.length]);

  // Images the creator kept are preferred; otherwise use what the search found.
  const pool = useMemo(() => {
    const kept = pack.visuals.map((index) => images[index]).filter(Boolean);
    const base = kept.length > 0 ? kept : images;
    return base.filter((image) => image.thumbnail || image.original);
  }, [images, pack.visuals]);

  const stageScale = scaleForWidth(previewWidth);

  const imageFor = useCallback(
    (slide: CarouselSlide) => {
      if (slide.imageIndex === null) return undefined;
      const image = pool[slide.imageIndex];
      if (!image) return undefined;
      return image.original || image.thumbnail || "";
    },
    [pool]
  );

  const canGenerate = hasSession && !generating;

  const carouselText = [
    title || `${dish} carousel`,
    "",
    ...slides.flatMap((slide, index) => [
      `SLIDE ${index + 1} — ${slide.title || "(untitled)"}`,
      slide.subtitle || slide.body,
      ...slide.ingredients.map((entry) => `[${entry.amount}] ${entry.ingredient}`),
      ...slide.steps.map((step) => `${step.label}. ${step.text}`),
      "",
    ]),
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const update = useCallback(
    (id: string, patch: Partial<CarouselSlide>) => {
      onSlidesChange(slides.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));
    },
    [onSlidesChange, slides]
  );

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;

    const next = [...slides];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onSlidesChange(next);
  };

  const remove = (id: string) => onSlidesChange(slides.filter((slide) => slide.id !== id));

  const addSlide = () => {
    onSlidesChange([
      ...slides,
      {
        id: `slide-${Date.now().toString(36)}`,
        type: "fact",
        title: "",
        subtitle: "",
        body: "",
        ingredients: [],
        steps: [],
        imageIndex: null,
        focus: "center",
        anchor: "bottom-left",
        anchorAuto: true,
        overlay: "auto",
        style: "editorial",
        evidence: [],
      },
    ]);
  };

  /** Spread the available photographs across the slides that lack one. */
  const autoAssignImages = () => {
    if (pool.length === 0) return;

    let cursor = 0;
    onSlidesChange(
      slides.map((slide) => {
        if (slide.imageIndex !== null && pool[slide.imageIndex]) return slide;
        const next = { ...slide, imageIndex: cursor % pool.length };
        cursor += 1;
        return next;
      })
    );
  };

  const applyStyleToAll = (style: SlideStyle) => {
    onSlidesChange(slides.map((slide) => ({ ...slide, style })));
  };

  const runExport = async () => {
    const targets = slides.flatMap((slide, index) => {
      const node = stageRefs.current.get(slide.id);
      if (!node) return [];
      return [
        {
          node,
          filename: `${slugify(dish || "carousel")}-${pad(index + 1)}-${slide.type}.png`,
        },
      ];
    });

    if (targets.length === 0) {
      setExportNote("There is nothing to export yet.");
      return;
    }

    setExporting(true);
    setExportNote(null);

    try {
      const result = await exportSlides(targets, (done, total) =>
        setExportNote(`Exporting ${done} of ${total}…`)
      );

      setExportNote(
        result.failed === 0
          ? `Exported ${result.exported} PNG${result.exported === 1 ? "" : "s"} at ${SLIDE_CANVAS.width} × ${SLIDE_CANVAS.height}.`
          : `Exported ${result.exported} of ${result.failed + result.exported}. Some slides failed to render.`
      );
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!exporting && exportNote?.startsWith("Exporting")) setExportNote(null);
  }, [exporting, exportNote]);

  if (!hasSession) {
    return (
      <main className="plan-page">
        <div className="empty-state empty-state-large">
          <ListOrdered size={26} />
          <p>
            Nothing to build from yet. Search a dish first — the carousel is
            written only from the recipes and sources that search returns.
          </p>
          <button className="button button-primary" onClick={onGoStart}>
            Start with a dish
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="plan-page">
      <header className="plan-head">
        <div>
          {/* <span className="eyebrow">Ready to post</span> */}
          <h1>Create my carousel</h1>
          <p>
            Written from the recipes and sources retrieved for{" "}
            <strong>{dish}</strong>
            {context ? ` · ${context}` : ""}. Every slide is a full-bleed
            photograph with the words typeset over it.
          </p>
        </div>

        {slides.length > 0 && (
          <div className="plan-head-actions">
            <button className="button button-quiet" onClick={onCopy}>
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? "Copied" : "Copy all text"}
            </button>
            <button
              className="button button-quiet"
              onClick={() => downloadText(`${slugify(dish)}-carousel.txt`, carouselText)}
            >
              <Download size={14} /> Text
            </button>
            <button className="button button-primary" onClick={runExport} disabled={exporting}>
              {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              {exporting ? "Exporting…" : `Export PNG ×${slides.length}`}
            </button>
            <button
              className={carouselSaved ? "button button-quiet button-quiet-done" : "button button-quiet"}
              onClick={onSaveCarousel}
              disabled={carouselSaved}
            >
              {carouselSaved ? <Check size={14} /> : <Save size={14} />}
              {carouselSaved ? "Saved" : "Save carousel"}
            </button>
          </div>
        )}
      </header>

      <section className="plan-block plan-types" aria-label="Carousel type">
        <span className="eyebrow">What kind of carousel?</span>
        <div className="direction-list direction-row">
          {CAROUSEL_TYPES.map((option) => (
            <button
              key={option.id}
              className={type === option.id ? "direction direction-on" : "direction"}
              onClick={() => onTypeChange(option.id)}
              aria-pressed={type === option.id}
            >
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </section>

      {(error || exportNote) && (
        <p className={error ? "form-error" : "plan-export-note"} role="status">
          {error || exportNote}
        </p>
      )}

      {slides.length === 0 ? (
        <div className="plan-generate">
          <button className="button button-primary button-big" onClick={onGenerate} disabled={!canGenerate}>
            {generating ? (
              <>
                <span className="spinner" aria-hidden="true" /> Writing your slides…
              </>
            ) : (
              <>
                <Sparkles size={16} /> Create my carousel
              </>
            )}
          </button>
          <p className="plan-hint">
            {generating
              ? `Reading the sources and writing ${carouselTypeLabel(type).toLowerCase()} slides…`
              : "Grounded in the retrieved recipes and sources — measurements copied verbatim, nothing invented."}
          </p>
        </div>
      ) : (
        <>
          <div className="plan-title-row">
            <input
              className="outline-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Carousel title"
              aria-label="Carousel title"
            />
            <button className="button button-quiet" onClick={onGenerate} disabled={generating}>
              {generating ? (
                <>
                  <span className="spinner spinner-dark" aria-hidden="true" /> Rewriting…
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Regenerate all
                </>
              )}
            </button>
          </div>

          {slides.length > 0 && (
            <section className="plan-block plan-look" aria-label="Look and feel">
              <div className="plan-look-row">
                <span className="eyebrow">Look</span>
                <div className="look-chips">
                  {SLIDE_STYLES.map((option) => (
                    <button
                      key={option.id}
                      className={
                        slides.every((slide) => slide.style === option.id)
                          ? "look-chip look-chip-on"
                          : "look-chip"
                      }
                      onClick={() => applyStyleToAll(option.id)}
                      title={option.note}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="plan-look-row">
                <span className="eyebrow">Photographs</span>
                <button
                  className="button button-quiet button-small"
                  onClick={autoAssignImages}
                  disabled={pool.length === 0}
                >
                  <ImagePlus size={13} /> Spread across slides
                </button>
                <span className="plan-look-note">
                  {pool.length === 0
                    ? "No photographs available for this search — slides will export with a plain ground."
                    : `${pool.length} available`}
                </span>
              </div>
            </section>
          )}

          <div className="cs-list" ref={listRef}>
            {slides.map((slide, index) => {
              const editing = editingId === slide.id;
              const busy = regeneratingIndex === index;
              const raw = displayImageUrl(imageFor(slide));
              const art = slideImageUrl(raw);
              const scale = stageScale;
              const chosen = slide.imageIndex !== null && pool[slide.imageIndex] ? pool[slide.imageIndex] : undefined;

              return (
                <article className="cs-item" key={slide.id}>
                  {/* ---------------- the slide: artwork only ---------------- */}
                  <div
                    className="cs-stage"
                    style={{
                      width: SLIDE_CANVAS.width * scale,
                      height: SLIDE_CANVAS.height * scale,
                    }}
                  >
                    <div
                      className="cs-stage-scale"
                      style={{
                        width: SLIDE_CANVAS.width,
                        height: SLIDE_CANVAS.height,
                        transform: `scale(${scale})`,
                      }}
                      ref={(node) => setStageRef(slide.id, node)}
                    >
                      <SlideArtwork
                        slide={slide}
                        image={art || undefined}
                        imageTitle={chosen?.title}
                        typeLabel={carouselTypeLabel(type)}
                      />
                    </div>
                  </div>

                  {/* ---------------- controls: outside the slide ---------------- */}
                  <div className="cs-panel">
                    <div className="cs-item-bar">
                      <span className="cs-item-number">
                        {pad(index + 1)} · {SLIDE_LAYOUT_OPTIONS.find((l) => l.id === slide.type)?.label ?? slide.type}
                        {chosen ? ` · ${chosen.source || chosen.title || "photograph"}` : " · no photograph"}
                      </span>
                      <div className="cs-item-actions">
                        <button onClick={() => setEditingId(editing ? null : slide.id)} aria-label={editing ? "Done editing" : "Edit slide copy"}>
                          {editing ? <X size={14} /> : <Pencil size={14} />}
                          {editing ? "Done" : "Edit copy"}
                        </button>
                        <button onClick={() => onRegenerateSlide(index)} disabled={busy} aria-label={`Regenerate slide ${index + 1}`}>
                          {busy ? (
                            <span className="spinner spinner-dark" aria-hidden="true" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          Rewrite
                        </button>
                        <button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move slide ${index + 1} up`}>
                          <ArrowUp size={14} />
                        </button>
                        <button onClick={() => move(index, 1)} disabled={index === slides.length - 1} aria-label={`Move slide ${index + 1} down`}>
                          <ArrowDown size={14} />
                        </button>
                        <button className="cs-remove" onClick={() => remove(slide.id)} aria-label={`Delete slide ${index + 1}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="cs-controls">
                      <label className="cs-control">
                        <span>Slide role</span>
                        <select
                          value={slide.type}
                          onChange={(event) => update(slide.id, { type: event.target.value as SlideLayout })}
                        >
                          {SLIDE_LAYOUT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="cs-control">
                        <span>Look</span>
                        <select
                          value={slide.style}
                          onChange={(event) => update(slide.id, { style: event.target.value as SlideStyle })}
                        >
                          {SLIDE_STYLES.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="cs-control">
                        <span>Text position</span>
                        <select
                          value={slide.anchor}
                          onChange={(event) =>
                            update(slide.id, {
                              anchor: event.target.value as TextAnchor,
                              anchorAuto: false,
                            })
                          }
                        >
                          {TEXT_ANCHORS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="cs-control">
                        <span>Overlay</span>
                        <select
                          value={slide.overlay}
                          onChange={(event) =>
                            update(slide.id, { overlay: event.target.value as OverlayVariant | "auto" })
                          }
                        >
                          <option value="auto">Auto (follows text)</option>
                          {OVERLAY_VARIANTS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Focus grid doubles as a composition diagram. */}
                    <div className="cs-focus">
                      <div>
                        <span className="cs-control-label">Subject in frame</span>
                        <span className="cs-control-hint">
                          Where the food sits. Text is suggested away from it.
                        </span>
                      </div>
                      <div className="focus-grid" role="group" aria-label="Subject position in frame">
                        {IMAGE_FOCUSES.map((option) => (
                          <button
                            key={option.id}
                            className={slide.focus === option.id ? "focus-cell focus-cell-on" : "focus-cell"}
onClick={() =>
                          update(slide.id, {
                            focus: option.id as ImageFocus,
                            anchor: slide.anchorAuto ? suggestAnchor(option.id as ImageFocus) : slide.anchor,
                          })
                        }
                            title={option.label}
                            aria-pressed={slide.focus === option.id}
                            aria-label={option.label}
                          >
                            <span />
                          </button>
                        ))}
                      </div>
                      <button
                        className="button button-quiet button-small"
                        onClick={() =>
                          update(slide.id, { anchor: suggestAnchor(slide.focus), anchorAuto: true })
                        }
                      >
                        Move text clear
                      </button>
                    </div>

                    <div className="cs-picker">
                      <span className="cs-control-label">Photograph</span>
                      {pool.length === 0 ? (
                        <p className="cs-picker-empty">
                          <ImageOff size={13} /> No photographs in this search.
                        </p>
                      ) : (
                        <div className="cs-picker-strip">
                          <button
                            className={slide.imageIndex === null ? "pick pick-on pick-none" : "pick pick-none"}
                            onClick={() => update(slide.id, { imageIndex: null })}
                            title="No photograph"
                            aria-label="No photograph"
                          >
                            <ImageOff size={14} />
                          </button>
                          {pool.map((image, poolIndex) => (
                            <button
                              key={`${image.link || image.original || poolIndex}`}
                              className={slide.imageIndex === poolIndex ? "pick pick-on" : "pick"}
                              onClick={() => update(slide.id, { imageIndex: poolIndex })}
                              title={image.title || image.source || `Image ${poolIndex + 1}`}
                              aria-label={image.title || image.source || `Image ${poolIndex + 1}`}
                              aria-pressed={slide.imageIndex === poolIndex}
                            >
                              <img src={image.thumbnail || image.original} alt="" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {editing && (
                      <div className="cs-edit">
                        <label>
                          <span>Headline</span>
                          <input
                            value={slide.title}
                            onChange={(event) => update(slide.id, { title: event.target.value })}
                            placeholder="Ekpang Nkukwo"
                          />
                        </label>
                        <label>
                          <span>Supporting line</span>
                          <input
                            value={slide.subtitle}
                            onChange={(event) => update(slide.id, { subtitle: event.target.value })}
                            placeholder="A Nigerian dish worth knowing"
                          />
                        </label>
                        <label>
                          <span>Body copy</span>
                          <textarea
                            value={slide.body}
                            onChange={(event) => update(slide.id, { body: event.target.value })}
                            placeholder="Short editorial text…"
                            rows={3}
                          />
                        </label>

                        {slide.type === "ingredients" && (
                          <div className="cs-repeat">
                            <span className="cs-control-label">Ingredients</span>
                            {slide.ingredients.map((entry, itemIndex) => (
                              <div className="cs-repeat-row" key={itemIndex}>
                                <input
                                  className="cs-amount"
                                  value={entry.amount}
                                  placeholder="4 cups"
                                  aria-label={`Measurement ${itemIndex + 1}`}
                                  onChange={(event) => {
                                    const next = [...slide.ingredients];
                                    next[itemIndex] = { ...entry, amount: event.target.value };
                                    update(slide.id, { ingredients: next });
                                  }}
                                />
                                <input
                                  value={entry.ingredient}
                                  placeholder="grated cocoyam"
                                  aria-label={`Ingredient ${itemIndex + 1}`}
                                  onChange={(event) => {
                                    const next = [...slide.ingredients];
                                    next[itemIndex] = { ...entry, ingredient: event.target.value };
                                    update(slide.id, { ingredients: next });
                                  }}
                                />
                                <button
                                  onClick={() =>
                                    update(slide.id, {
                                      ingredients: slide.ingredients.filter((_, i) => i !== itemIndex),
                                    })
                                  }
                                  aria-label={`Remove ingredient ${itemIndex + 1}`}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                            <button
                              className="button button-quiet button-small"
                              onClick={() =>
                                update(slide.id, {
                                  ingredients: [
                                    ...slide.ingredients,
                                    { amount: "", ingredient: "" } as SlideIngredient,
                                  ],
                                })
                              }
                            >
                              <ImagePlus size={13} /> Add ingredient
                            </button>
                          </div>
                        )}

                        {slide.type === "method" && (
                          <div className="cs-repeat">
                            <span className="cs-control-label">Steps</span>
                            {slide.steps.map((step, stepIndex) => (
                              <div className="cs-repeat-row" key={stepIndex}>
                                <input
                                  className="cs-amount"
                                  value={step.label}
                                  aria-label={`Step number ${stepIndex + 1}`}
                                  onChange={(event) => {
                                    const next = [...slide.steps];
                                    next[stepIndex] = { ...step, label: event.target.value };
                                    update(slide.id, { steps: next });
                                  }}
                                />
                                <input
                                  value={step.text}
                                  placeholder="Prepare the cocoyam…"
                                  aria-label={`Step ${stepIndex + 1}`}
                                  onChange={(event) => {
                                    const next = [...slide.steps];
                                    next[stepIndex] = { ...step, text: event.target.value };
                                    update(slide.id, { steps: next });
                                  }}
                                />
                                <button
                                  onClick={() =>
                                    update(slide.id, {
                                      steps: slide.steps.filter((_, i) => i !== stepIndex),
                                    })
                                  }
                                  aria-label={`Remove step ${stepIndex + 1}`}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                            <button
                              className="button button-quiet button-small"
                              onClick={() =>
                                update(slide.id, {
                                  steps: [
                                    ...slide.steps,
                                    {
                                      label: pad(slide.steps.length + 1),
                                      text: "",
                                    },
                                  ],
                                })
                              }
                            >
                              <ImagePlus size={13} /> Add step
                            </button>
                            <span className="cs-control-hint">
                              Long methods should be split across slides rather than crowded into one.
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {slide.evidence.length > 0 && (
                      <p className="cs-evidence">
                        <span>Grounded in</span>
                        {slide.evidence.map((entry) => (
                          <span className="source-chip" key={entry}>
                            {entry}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <button className="add-slide" onClick={addSlide}> Add a slide
          </button>
        </>
      )}
    </main>
  );
}
