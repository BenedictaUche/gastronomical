"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Plus } from "lucide-react";
import {
  SOURCE_FILTERS,
  SOURCE_TYPE_LABEL,
  hostOf,
  isSourceSaved,
  sourceType,
  type ResearchSource,
  type ResearchPack,
  type SourceType,
} from "@/lib/studio";
import { Modal } from "./Modal";

type SourceLibraryProps = {
  sources: ResearchSource[];
  pack: ResearchPack;
  onToggleSave: (index: number) => void;
};

export function SourceLibrary({ sources, pack, onToggleSave }: SourceLibraryProps) {
  const [filter, setFilter] = useState<SourceType | "all">("all");
  const [inspecting, setInspecting] = useState<number | null>(null);

  const counts = useMemo(() => {
    const result: Record<SourceType, number> = { recipe: 0, article: 0, social: 0, other: 0 };
    sources.forEach((source) => {
      result[sourceType(source)] += 1;
    });
    return result;
  }, [sources]);

  const visible = useMemo(
    () =>
      sources
        .map((source, index) => ({ source, index }))
        .filter(({ source }) => filter === "all" || sourceType(source) === filter),
    [filter, sources],
  );

  const active = inspecting !== null ? sources[inspecting] : null;

  return (
    <section className="section section-sources" aria-labelledby="sources-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">Source library</span>
          <h2 id="sources-heading">What the search actually found</h2>
          <p>
            Search results, some with their page text pulled out. A source is
            only labelled &ldquo;recipe&rdquo; when it really carries ingredients
            or method — nothing here has been verified on your behalf.
          </p>
        </div>
        <p className="section-tally">
          {sources.length} sources · {pack.sources.length} kept
        </p>
      </div>

      <div className="filter-row" role="group" aria-label="Filter sources by type">
        {SOURCE_FILTERS.filter((option) => option.id === "all" || counts[option.id] > 0).map(
          (option) => (
            <button
              key={option.id}
              className={filter === option.id ? "filter filter-active" : "filter"}
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
            >
              {option.label}
              <span className="filter-count">
                {option.id === "all" ? sources.length : counts[option.id]}
              </span>
            </button>
          ),
        )}
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">
          No sources of this type came back for this search.
        </p>
      ) : (
        <ol className="source-list">
          {visible.map(({ source, index }) => {
            const type = sourceType(source);
            const kept = isSourceSaved(pack, index);
            const host = hostOf(source.url) || source.source || "Web";

            return (
              <li key={source.url || `${source.title}-${index}`} className="source-row">
                <span className="source-index">{String(index + 1).padStart(2, "0")}</span>

                <div className="source-body">
                  <div className="source-heading">
                    <h3>{source.title || "Untitled source"}</h3>
                    <span className={`type-tag type-${type}`}>{SOURCE_TYPE_LABEL[type]}</span>
                  </div>

                  <p className="source-byline">
                    {host}
                    {type === "recipe" && source.ingredients?.length
                      ? ` · ${source.ingredients.length} listed ingredients`
                      : ""}
                    {source.cookTime ? ` · ${source.cookTime}` : ""}
                  </p>

                  <p className="source-snippet">
                    {source.snippet ||
                      (source.content
                        ? `${source.content.slice(0, 240)}…`
                        : "No preview text was available for this result.")}
                  </p>

                  <div className="source-actions">
                    <button className="text-action" onClick={() => setInspecting(index)}>
                      Read this source
                    </button>
                    {source.url && (
                      <a
                        className="text-action"
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={13} /> Original page
                      </a>
                    )}
                    <button
                      className={kept ? "keep keep-on" : "keep"}
                      onClick={() => onToggleSave(index)}
                      aria-pressed={kept}
                    >
                      {kept ? <Check size={13} /> : <Plus size={13} />}
                      {kept ? "In pack" : "Keep"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {active && inspecting !== null && (
        <Modal onClose={() => setInspecting(null)} label="Read source">
          <div className="source-inspect">
            <span className="eyebrow">{SOURCE_TYPE_LABEL[sourceType(active)]}</span>
            <h3>{active.title || "Untitled source"}</h3>
            <p className="source-byline">{active.source || hostOf(active.url) || "Web source"}</p>

            {(active.cookTime || active.yield) && (
              <p className="source-facts">
                {[active.cookTime, active.yield].filter(Boolean).join(" · ")}
              </p>
            )}

            {active.ingredients?.length ? (
              <div className="inspect-section">
                <span className="eyebrow">Ingredients on the page</span>
                <ul className="ingredient-list">
                  {active.ingredients.map((ingredient, index) => (
                    <li key={`${ingredient}-${index}`}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {active.instructions?.length ? (
              <div className="inspect-section">
                <span className="eyebrow">Method on the page</span>
                <ol className="method-list">
                  {active.instructions.map((step, index) => (
                    <li key={`${step}-${index}`}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="inspect-section">
              <span className="eyebrow">
                {active.content ? "Page text" : active.snippet ? "Search snippet" : "What we have"}
              </span>
              <p className="source-extract">
                {active.content
                  ? `${active.content.slice(0, 1400)}${active.content.length > 1400 ? "…" : ""}`
                  : active.snippet
                    ? active.snippet
                    : "Only the search result was available — the page itself could not be read."}
              </p>
            </div>

            <div className="inspect-actions">
              <button
                className="button button-primary"
                onClick={() => onToggleSave(inspecting)}
              >
                {isSourceSaved(pack, inspecting) ? <Check size={15} /> : <Plus size={15} />}
                {isSourceSaved(pack, inspecting) ? "Kept in pack" : "Keep in pack"}
              </button>
              {active.url && (
                <a
                  className="button button-quiet"
                  href={active.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={15} /> Open original
                </a>
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
