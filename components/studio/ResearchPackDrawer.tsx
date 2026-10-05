"use client";

import { useEffect } from "react";
import {
  Bookmark,
  Check,
  Clipboard,
  Download,
  ExternalLink,
  NotebookPen,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  SOURCE_TYPE_LABEL,
  downloadText,
  packSize,
  shotNoteLabel,
  slugify,
  sourceType,
  type ResearchImage,
  type ResearchPack,
  type ResearchSource,
} from "@/lib/studio";

type ResearchPackDrawerProps = {
  open: boolean;
  onClose: () => void;
  dish: string;
  pack: ResearchPack;
  images: ResearchImage[];
  sources: ResearchSource[];
  copied: boolean;
  onCopy: () => void;
  onRemoveVisual: (index: number) => void;
  onRemoveSource: (index: number) => void;
  onRemoveFinding: (id: string) => void;
  onRemoveNote: (note: string) => void;
  onClear: () => void;
  onPlan: () => void;
};

export function ResearchPackDrawer({
  open,
  onClose,
  dish,
  pack,
  images,
  sources,
  copied,
  onCopy,
  onRemoveVisual,
  onRemoveSource,
  onRemoveFinding,
  onRemoveNote,
  onClear,
  onPlan,
}: ResearchPackDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  if (!open) return null;

  const count = packSize(pack);
  const empty = count === 0;

  const packText = [
    `MY CONTENT PACK — ${dish || "Untitled project"}`,
    "",
    `VISUAL REFERENCES (${pack.visuals.length})`,
    ...pack.visuals.map((index) => {
      const image = images[index];
      return image
        ? `- ${image.title || "Untitled image"} — ${image.source || "Google Images"} (${image.link || image.original || ""})`
        : "";
    }),
    "",
    `SOURCES (${pack.sources.length})`,
    ...pack.sources.map((index) => {
      const source = sources[index];
      return source ? `- ${source.title || "Untitled source"} — ${source.source || "Web"} (${source.url || ""})` : "";
    }),
    "",
    `FINDINGS (${pack.findings.length})`,
    ...pack.findings.map((finding) => `- ${finding.text}`),
    "",
    `MY NOTES (${pack.notes.length})`,
    ...pack.notes.map((note) => `- ${note}`),
  ]
    .filter((line) => line !== "")
    .join("\n");

  return (
    <div className="pack-overlay" onMouseDown={onClose}>
      <aside
        className="pack-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="My content pack"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pack-head">
          <div>
            <span className="eyebrow">Everything you chose to keep</span>
            <h2>
              {dish ? `My content pack for ${dish}` : "My content pack"}{" "}
              <span className="pack-total">{count}</span>
            </h2>
          </div>
          <button className="pack-close" onClick={onClose} aria-label="Close content pack">
            <X size={18} />
          </button>
        </header>

        {empty ? (
          <div className="pack-empty">
            <Bookmark size={26} />
            <p>
              Nothing kept yet. Use <strong>Use in carousel</strong> on an image
              or keep a source and it lands here.
            </p>
          </div>
        ) : (
          <div className="pack-body">
            {pack.carousel && (
              <section className="pack-group">
                <div className="pack-group-head">
                  <h3>Saved carousel</h3>
                  <span>{pack.carousel.slides.length}</span>
                </div>
                <p className="pack-carousel-note">
                  <Sparkles size={14} aria-hidden="true" />
                  {pack.carousel.title || "Untitled carousel"} — saved{" "}
                  {new Date(pack.carousel.savedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </section>
            )}

            <section className="pack-group">
              <div className="pack-group-head">
                <h3>Images for the carousel</h3>
                <span>{pack.visuals.length}</span>
              </div>
              <ul className="pack-images">
                {pack.visuals.map((index) => {
                  const image = images[index];
                  if (!image) return null;

                  return (
                    <li key={index}>
                      <img
                        src={image.thumbnail || image.original || ""}
                        alt={image.title || "Kept visual reference"}
                        loading="lazy"
                      />
                      <span className="pack-item-text">
                        <strong>{image.title || "Untitled image"}</strong>
                        <small>
                          {image.source || "Google Images"}
                          {pack.imageNotes[index] ? ` · ${shotNoteLabel(pack.imageNotes[index])}` : ""}
                        </small>
                      </span>
                      {image.link && (
                        <a
                          className="pack-icon"
                          href={image.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open original image source"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        className="pack-icon"
                        onClick={() => onRemoveVisual(index)}
                        aria-label={`Remove ${image.title || "visual reference"} from pack`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="pack-group">
              <div className="pack-group-head">
                <h3>Sources</h3>
                <span>{pack.sources.length}</span>
              </div>
              <ul className="pack-items">
                {pack.sources.map((index) => {
                  const source = sources[index];
                  if (!source) return null;

                  return (
                    <li key={index}>
                      <Search size={14} className="pack-item-icon" aria-hidden="true" />
                      <span className="pack-item-text">
                        <strong>{source.title || "Untitled source"}</strong>
                        <small>{SOURCE_TYPE_LABEL[sourceType(source)]}</small>
                      </span>
                      {source.url && (
                        <a
                          className="pack-icon"
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open original source page"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        className="pack-icon"
                        onClick={() => onRemoveSource(index)}
                        aria-label={`Remove ${source.title || "source"} from pack`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="pack-group">
              <div className="pack-group-head">
                <h3>Findings</h3>
                <span>{pack.findings.length}</span>
              </div>
              <ul className="pack-items">
                {pack.findings.map((finding) => (
                  <li key={finding.id}>
                    <Sparkles size={14} className="pack-item-icon" aria-hidden="true" />
                    <span className="pack-item-text">
                      <strong>{finding.text}</strong>
                      {finding.sources.length > 0 && <small>From {finding.sources.join(", ")}</small>}
                    </span>
                    <button
                      className="pack-icon"
                      onClick={() => onRemoveFinding(finding.id)}
                      aria-label="Remove finding from pack"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pack-group">
              <div className="pack-group-head">
                <h3>Your notes</h3>
                <span>{pack.notes.length}</span>
              </div>
              <ul className="pack-items">
                {pack.notes.map((note, index) => (
                  <li key={`${note}-${index}`}>
                    <NotebookPen size={14} className="pack-item-icon" aria-hidden="true" />
                    <span className="pack-item-text">
                      <strong>{note}</strong>
                    </span>
                    <button
                      className="pack-icon"
                      onClick={() => onRemoveNote(note)}
                      aria-label="Remove note from pack"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <footer className="pack-foot">
          <button className="button button-primary" onClick={onPlan}>
            <Sparkles size={14} /> Create carousel from this
          </button>
          <div className="pack-foot-row">
            <button className="button button-quiet" onClick={onCopy} disabled={empty}>
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? "Copied" : "Copy pack"}
            </button>
            <button
              className="button button-quiet"
              onClick={() => downloadText(`${slugify(dish)}-research-pack.txt`, packText)}
              disabled={empty}
            >
              <Download size={14} /> Download
            </button>
            <button className="button button-quiet button-quiet-danger" onClick={onClear} disabled={empty}>
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}