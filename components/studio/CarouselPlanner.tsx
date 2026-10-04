"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Clipboard,
  Download,
  ListOrdered,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  CAROUSEL_DIRECTIONS,
  downloadText,
  packSize,
  slugify,
  type CarouselSlide,
  type ResearchPack,
} from "@/lib/studio";

type CarouselPlannerProps = {
  hasSession: boolean;
  dish: string;
  context: string;
  pack: ResearchPack;
  model: string;
  title: string;
  slides: CarouselSlide[];
  direction: string;
  generating: boolean;
  error: string | null;
  copied: boolean;
  onDirectionChange: (id: string) => void;
  onGenerate: () => void;
  onTitleChange: (title: string) => void;
  onSlidesChange: (slides: CarouselSlide[]) => void;
  onCopy: () => void;
  onGoStart: () => void;
  onOpenPack: () => void;
};

export function CarouselPlanner({
  hasSession,
  dish,
  context,
  pack,
  model,
  title,
  slides,
  direction,
  generating,
  error,
  copied,
  onDirectionChange,
  onGenerate,
  onTitleChange,
  onSlidesChange,
  onCopy,
  onGoStart,
  onOpenPack,
}: CarouselPlannerProps) {
  const kept = packSize(pack);
  const canGenerate = kept > 0 && !generating;

  const outlineText = [
    `${title || `${dish} carousel`}`,
    context ? `Context: ${context}` : "",
    `Direction: ${CAROUSEL_DIRECTIONS.find((item) => item.id === direction)?.label ?? direction}`,
    "",
    ...slides.flatMap((slide, index) => [
      `${index + 1}. ${slide.title || "Untitled slide"}`,
      slide.body ? `   ${slide.body}` : "",
      slide.evidence.length ? `   Grounded in: ${slide.evidence.join("; ")}` : "",
    ]),
  ]
    .filter((line) => line !== "")
    .join("\n");

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;

    const next = [...slides];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onSlidesChange(next);
  };

  const update = (id: string, patch: Partial<CarouselSlide>) => {
    onSlidesChange(slides.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));
  };

  const remove = (id: string) => {
    onSlidesChange(slides.filter((slide) => slide.id !== id));
  };

  const addSlide = () => {
    onSlidesChange([
      ...slides,
      { id: `slide-${Date.now().toString(36)}`, title: "", body: "", evidence: [] },
    ]);
  };

  if (!hasSession) {
    return (
      <main className="plan-page">
        <div className="empty-state empty-state-large">
          <ListOrdered size={26} />
          <p>
            There is no research loaded. Run a search first — the planner builds
            a carousel from what you actually kept, not from the model&apos;s
            imagination.
          </p>
          <button className="button button-primary" onClick={onGoStart}>
            Start research
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="plan-page">
      <header className="plan-head">
        <div>
          <span className="eyebrow">Create from research</span>
          <h1>Plan a carousel</h1>
          <p>
            A starting structure built from the {kept} item
            {kept === 1 ? "" : "s"} in your pack for <strong>{dish}</strong>. Every
            slide is editable, and nothing is written for you beyond the outline.
          </p>
        </div>
      </header>

      <div className="plan-layout">
        <aside className="plan-controls">
          <section className="plan-block">
            <span className="eyebrow">1 · Choose a direction</span>
            <div className="direction-list">
              {CAROUSEL_DIRECTIONS.map((option) => (
                <button
                  key={option.id}
                  className={direction === option.id ? "direction direction-on" : "direction"}
                  onClick={() => onDirectionChange(option.id)}
                  aria-pressed={direction === option.id}
                >
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="plan-block">
            <span className="eyebrow">2 · What it will use</span>
            <ul className="plan-inputs">
              <li>
                <span>{pack.findings.length}</span> kept finding
                {pack.findings.length === 1 ? "" : "s"}
              </li>
              <li>
                <span>{pack.sources.length}</span> kept source
                {pack.sources.length === 1 ? "" : "s"}
              </li>
              <li>
                <span>{pack.visuals.length}</span> kept image
                {pack.visuals.length === 1 ? "" : "s"}
              </li>
              <li>
                <span>{pack.notes.length}</span> note{pack.notes.length === 1 ? "" : "s"} (as ideas,
                never as facts)
              </li>
            </ul>
            <button className="button button-quiet" onClick={onOpenPack}>
              Review the pack
            </button>
          </section>

          <button className="button button-primary button-wide" onClick={onGenerate} disabled={!canGenerate}>
            {generating ? (
              <>
                <span className="spinner" aria-hidden="true" /> Drafting outline…
              </>
            ) : (
              <>
                <Sparkles size={15} /> Draft outline with {model}
              </>
            )}
          </button>

          {kept === 0 && (
            <p className="plan-hint">
              Keep at least one finding or source and the draft becomes possible.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </aside>

        <section className="plan-outline">
          <div className="plan-outline-head">
            <div>
              <span className="eyebrow">3 · Edit the outline</span>
              {title ? (
                <input
                  className="outline-title"
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  aria-label="Carousel working title"
                />
              ) : (
                <p className="outline-empty">
                  {slides.length === 0
                    ? "Nothing drafted yet."
                    : "Untitled carousel"}
                </p>
              )}
            </div>
            {slides.length > 0 && (
              <div className="plan-outline-actions">
                <button className="button button-quiet" onClick={onCopy}>
                  {copied ? <Check size={14} /> : <Clipboard size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  className="button button-quiet"
                  onClick={() =>
                    downloadText(`${slugify(dish)}-carousel-outline.txt`, outlineText)
                  }
                >
                  <Download size={14} /> Export
                </button>
              </div>
            )}
          </div>

          {slides.length === 0 ? (
            <p className="empty-state">
              {generating
                ? "Reading your pack…"
                : "Choose a direction and draft an outline. You can reorder, rewrite or delete every slide afterwards."}
            </p>
          ) : (
            <ol className="slide-list">
              {slides.map((slide, index) => (
                <li key={slide.id} className="slide">
                  <span className="slide-number">{String(index + 1).padStart(2, "0")}</span>

                  <div className="slide-fields">
                    <input
                      className="slide-title"
                      value={slide.title}
                      onChange={(event) => update(slide.id, { title: event.target.value })}
                      placeholder="Slide title"
                      aria-label={`Slide ${index + 1} title`}
                    />
                    <textarea
                      className="slide-body"
                      value={slide.body}
                      onChange={(event) => update(slide.id, { body: event.target.value })}
                      placeholder="What this slide should say…"
                      rows={2}
                      aria-label={`Slide ${index + 1} description`}
                    />
                    {slide.evidence.length > 0 ? (
                      <p className="slide-evidence">
                        <span>Grounded in</span>
                        {slide.evidence.map((entry) => (
                          <span className="source-chip" key={entry}>
                            {entry}
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="slide-evidence slide-evidence-none">
                        Structural slide — no factual claim attached.
                      </p>
                    )}
                  </div>

                  <div className="slide-controls">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move slide ${index + 1} up`}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === slides.length - 1}
                      aria-label={`Move slide ${index + 1} down`}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className="slide-remove"
                      onClick={() => remove(slide.id)}
                      aria-label={`Delete slide ${index + 1}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {slides.length > 0 && (
            <button className="add-slide" onClick={addSlide}>
              <Plus size={14} /> Add a slide
            </button>
          )}
        </section>
      </div>
    </main>
  );
}