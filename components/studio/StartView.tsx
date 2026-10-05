"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, Check, Plus, Search } from "lucide-react";
import {
  CONTENT_TYPES,
  DEFAULT_CONTENT_TYPE,
  DEFAULT_MODEL_ID,
  MODELS,
  sourceType,
  type SavedSession,
} from "@/lib/studio";

type StartViewProps = {
  dish: string;
  context: string;
  kind: string;
  extra: string;
  model: string;
  loading: boolean;
  phase: "searching" | "analyzing" | null;
  error: string | null;
  sessions: SavedSession[];
  onDishChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onKindChange: (value: string) => void;
  onExtraChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSubmit: () => void;
  onOpenSession: (session: SavedSession) => void;
};

// Suggestions rotate through the food world rather than pinning one dish as
// the identity of the product.
const IDEAS: { dish: string; context: string; kind: string }[] = [
  { dish: "Ekpang Nkukwo", context: "Nigerian Ibibio", kind: "Recipe" },
  { dish: "Jollof rice", context: "West African", kind: "Recipe roundup" },
  { dish: "Mofongo", context: "Traditional Puerto Rican", kind: "Recipe" },
  { dish: "Okonomiyaki", context: "Kansai Japanese", kind: "Food discovery" },
];

const recipeCount = (session: SavedSession) =>
  (session.sources ?? []).filter((source) => sourceType(source) === "recipe").length;

export function StartView({
  dish,
  context,
  kind,
  extra,
  model,
  loading,
  phase,
  error,
  sessions,
  onDishChange,
  onContextChange,
  onKindChange,
  onExtraChange,
  onModelChange,
  onSubmit,
  onOpenSession,
}: StartViewProps) {
  const recent = sessions.slice(0, 3);
  const [advanced, setAdvanced] = useState(false);

  return (
    <main className="start-page">
      <div className="start-hero">
        <h1>
          What are you making
          <em> content about?</em>
        </h1>
        <p className="start-lede">
          Find reliable recipes, compare sources, and turn your research into a
          ready-to-use carousel.
        </p>
      </div>

      <section className="start-form" aria-label="Start a search">
        <label className="field field-search">
          <span className="sr-only">Search a dish, ingredient, or food idea</span>
          <Search size={20} className="search-icon" aria-hidden="true" />
          <input
            value={dish}
            onChange={(event) => onDishChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !loading) onSubmit();
            }}
            placeholder="Search a dish, ingredient, or food idea…"
            autoComplete="off"
          />
        </label>

        <fieldset className="field type-field">
          <legend className="field-label">What are you creating?</legend>
          <div className="type-grid">
            {CONTENT_TYPES.map((option) => (
              <button
                type="button"
                key={option.id}
                className={kind === option.id ? "type-card type-card-on" : "type-card"}
                aria-pressed={kind === option.id}
                onClick={() => onKindChange(option.id)}
              >
                <span className="type-card-head">
                  {kind === option.id && <Check size={13} />}
                  <strong>{option.label}</strong>
                </span>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="start-form-footer">
          <button
            className="button button-primary button-big"
            onClick={onSubmit}
            disabled={loading || !dish.trim()}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {phase === "analyzing" ? "Reading the sources…" : "Searching…"}
              </>
            ) : (
              <>
                Find recipes <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <div className="start-form-extra">
          <button
            type="button"
            className="disclosure"
            onClick={() => setAdvanced((value) => !value)}
            aria-expanded={advanced}
          >
            {advanced ? <ChevronDown size={15} /> : <Plus size={15} />}
            {advanced ? "Hide advanced options" : "Advanced options"}
            <span>Optional</span>
          </button>

          {advanced && (
            <div className="advanced-box">
              <label className="field">
                <span className="field-label">Context or regional focus</span>
                <input
                  value={context}
                  onChange={(event) => onContextChange(event.target.value)}
                  placeholder="Nigerian Ibibio, Traditional Puerto Rican…"
                  autoComplete="off"
                />
              </label>

              <label className="field">
                <span className="field-label">Anything extra to pay attention to</span>
                <textarea
                  value={extra}
                  onChange={(event) => onExtraChange(event.target.value)}
                  placeholder="Optional instructions for the search…"
                  rows={3}
                />
              </label>

              <label className="field">
                <span className="field-label">Model</span>
                <select
                  className="model-select"
                  value={model}
                  onChange={(event) => onModelChange(event.target.value)}
                  aria-label="Analysis model"
                >
                  {MODELS.map((option) => (
                    <option key={option.id} value={option.id} disabled={!option.available}>
                      {option.name}
                      {option.available ? "" : " — unavailable"}
                    </option>
                  ))}
                </select>
                {model !== DEFAULT_MODEL_ID && (
                  <button
                    type="button"
                    className="model-reset"
                    onClick={() => onModelChange(DEFAULT_MODEL_ID)}
                  >
                    Reset to default
                  </button>
                )}
              </label>
            </div>
          )}
        </div>
      </section>

      <div className="idea-row">
        <span className="idea-row-label">Or start from</span>
        <div className="idea-chips">
          {IDEAS.map((idea) => (
            <button
              key={idea.dish}
              className="idea-chip"
              onClick={() => {
                onDishChange(idea.dish);
                onContextChange(idea.context);
                onKindChange(idea.kind || DEFAULT_CONTENT_TYPE);
              }}
            >
              <strong>{idea.dish}</strong>
              <small>{idea.context}</small>
            </button>
          ))}
        </div>
      </div>

      {recent.length > 0 && (
        <section className="recent-strip">
          <div className="recent-strip-head">
            <span className="eyebrow">Pick up where you left off</span>
            <h2>Your projects</h2>
          </div>
          <ul className="recent-list">
            {recent.map((session) => (
              <li key={session.id}>
                <button className="recent-item" onClick={() => onOpenSession(session)}>
                  {session.images?.[0]?.thumbnail || session.images?.[0]?.original ? (
                    <img src={session.images[0].thumbnail || session.images[0].original} alt="" />
                  ) : (
                    <span className="recent-item-blank" aria-hidden="true" />
                  )}
                  <span className="recent-item-text">
                    <strong>{session.dish}</strong>
                    <small>
                      {session.kind || "Recipe"} · {recipeCount(session)} recipes ·{" "}
                      {session.images?.length ?? 0} images
                      {session.savedAt
                        ? ` · Created ${new Date(session.savedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}`
                        : ""}
                    </small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
