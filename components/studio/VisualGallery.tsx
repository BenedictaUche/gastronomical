"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Plus, Search } from "lucide-react";
import {
  SHOT_NOTES,
  isImageSaved,
  shotNoteLabel,
  type ResearchImage,
  type ResearchPack,
  type ShotNote,
} from "@/lib/studio";
import { Modal } from "./Modal";

type VisualGalleryProps = {
  dish: string;
  images: ResearchImage[];
  pack: ResearchPack;
  onToggleSave: (index: number) => void;
  onSetNote: (index: number, note: ShotNote | undefined) => void;
};

const previewUrl = (image: ResearchImage) => image.thumbnail || image.original || "";
const fullUrl = (image: ResearchImage) => image.original || image.thumbnail || "";
const pageUrl = (image: ResearchImage) => image.link || image.original || "";

type Filter = "all" | "saved" | ShotNote;

export function VisualGallery({
  dish,
  images,
  pack,
  onToggleSave,
  onSetNote,
}: VisualGalleryProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [inspecting, setInspecting] = useState<number | null>(null);

  const notesInUse = useMemo(
    () => SHOT_NOTES.filter((note) => Object.values(pack.imageNotes).includes(note.id)).map((note) => note.id),
    [pack.imageNotes],
  );

  const visible = useMemo(
    () =>
      images
        .map((image, index) => ({ image, index }))
        .filter(({ index }) => {
          if (filter === "all") return true;
          if (filter === "saved") return isImageSaved(pack, index);
          return pack.imageNotes[index] === filter;
        }),
    [filter, images, pack],
  );

  const active = inspecting !== null ? images[inspecting] : null;

  return (
    <section className="section section-visuals" aria-labelledby="visuals-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">Visual discovery</span>
          <h2 id="visuals-heading">Photograph references</h2>
          <p>
            Everything Google Images returned for this search. Open one to look
            at it properly, keep the ones worth returning to, and label them with
            your own read of what each one shows.
          </p>
        </div>
        <p className="section-tally">
          {images.length} found · {pack.visuals.length} kept
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Filter visual references">
        <button
          className={filter === "all" ? "filter filter-active" : "filter"}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
        >
          All
        </button>
        <button
          className={filter === "saved" ? "filter filter-active" : "filter"}
          onClick={() => setFilter("saved")}
          aria-pressed={filter === "saved"}
        >
          Kept ({pack.visuals.length})
        </button>
        {notesInUse.map((note) => (
          <button
            key={note}
            className={filter === note ? "filter filter-active" : "filter"}
            onClick={() => setFilter(note)}
            aria-pressed={filter === note}
          >
            {shotNoteLabel(note)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">
          {images.length === 0
            ? "No images came back for this search. Adding a regional context usually helps — try a new research run."
            : "Nothing matches this filter yet. Keep an image or give it one of your own labels and it will appear here."}
        </p>
      ) : (
        <ul className="visual-grid">
          {visible.map(({ image, index }, position) => {
            const preview = previewUrl(image);
            const kept = isImageSaved(pack, index);
            const note = pack.imageNotes[index];

            // A restrained, repeating rhythm rather than a uniform grid.
            const shape =
              position % 7 === 3 ? "visual-tile-wide" : position % 5 === 2 ? "visual-tile-tall" : "";

            return (
              <li key={`${image.link || preview}-${index}`} className={`visual-tile ${shape}`.trim()}>
                <button
                  className="visual-open"
                  onClick={() => setInspecting(index)}
                  aria-label={`Inspect image: ${image.title || `${dish} visual reference`}`}
                >
                  {preview ? (
                    <img src={preview} alt={image.title || `${dish} visual reference`} loading="lazy" />
                  ) : (
                    <span className="visual-placeholder" aria-hidden="true" />
                  )}
                  <span className="visual-overlay">
                    <Search size={13} /> Inspect
                  </span>
                </button>

                <div className="visual-meta">
                  <p className="visual-title">{image.title || "Untitled image result"}</p>
                  <p className="visual-source">{image.source || "Google Images"}</p>
                  <div className="visual-actions">
                    <button
                      className={kept ? "keep keep-on" : "keep"}
                      onClick={() => onToggleSave(index)}
                      aria-pressed={kept}
                    >
                      {kept ? <Check size={13} /> : <Plus size={13} />}
                      {kept ? "In pack" : "Keep"}
                    </button>
                    {note && <span className="shot-tag">{shotNoteLabel(note)}</span>}
                    {pageUrl(image) && (
                      <a
                        className="keep keep-link"
                        href={pageUrl(image)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={13} />
                        Source
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {active && inspecting !== null && (
        <Modal onClose={() => setInspecting(null)} label="Inspect visual reference" wide>
          <div className="inspect">
            <div className="inspect-image">
              {fullUrl(active) ? (
                <img src={fullUrl(active)} alt={active.title || `${dish} visual reference`} />
              ) : (
                <span className="visual-placeholder" aria-hidden="true" />
              )}
            </div>
            <div className="inspect-body">
              <span className="eyebrow">Google Images result</span>
              <h3>{active.title || "Untitled image result"}</h3>
              <p className="inspect-source">
                Published by {active.source || "an unlisted source"}
              </p>

              <div className="inspect-actions">
                <button
                  className="button button-primary"
                  onClick={() => onToggleSave(inspecting)}
                >
                  {isImageSaved(pack, inspecting) ? <Check size={15} /> : <Plus size={15} />}
                  {isImageSaved(pack, inspecting) ? "Kept in pack" : "Keep in pack"}
                </button>
                {pageUrl(active) && (
                  <a
                    className="button button-quiet"
                    href={pageUrl(active)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={15} /> Open original
                  </a>
                )}
              </div>

              <div className="inspect-section">
                <span className="eyebrow">Your read of this image</span>
                <p className="inspect-hint">
                  Search results carry no category, so this label is yours — the
                  studio does not claim what the photograph represents.
                </p>
                <div className="shot-options">
                  {SHOT_NOTES.map((option) => {
                    const selected = pack.imageNotes[inspecting] === option.id;

                    return (
                      <button
                        key={option.id}
                        className={selected ? "shot shot-on" : "shot"}
                        onClick={() =>
                          onSetNote(inspecting, selected ? undefined : option.id)
                        }
                        aria-pressed={selected}
                      >
                        {selected && <Check size={12} />}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="inspect-section">
                <span className="eyebrow">Where it came from</span>
                <p className="inspect-provenance">
                  Returned by Google Images for this search. Nothing about the
                  dish itself has been verified — open the source before you rely
                  on it.
                </p>
                {active.link && (
                  <p className="inspect-url">
                    <a href={active.link} target="_blank" rel="noopener noreferrer">
                      {active.link}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
