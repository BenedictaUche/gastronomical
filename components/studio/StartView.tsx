"use client";

import { ArrowRight, ChevronDown, Check, Plus, Sparkles } from "lucide-react";
import {
  DEFAULT_MODEL_ID,
  MODELS,
  RESEARCH_KINDS,
  modelLabel,
  type SavedSession,
} from "@/lib/studio";

type StartViewProps = {
  dish: string;
  context: string;
  kind: string;
  extra: string;
  showExtra: boolean;
  model: string;
  loading: boolean;
  phase: "searching" | "analyzing" | null;
  error: string | null;
  sessions: SavedSession[];
  onDishChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onKindChange: (value: string) => void;
  onExtraChange: (value: string) => void;
  onToggleExtra: () => void;
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

export function StartView({
  dish,
  context,
  kind,
  extra,
  showExtra,
  model,
  loading,
  phase,
  error,
  sessions,
  onDishChange,
  onContextChange,
  onKindChange,
  onExtraChange,
  onToggleExtra,
  onModelChange,
  onSubmit,
  onOpenSession,
}: StartViewProps) {
  const recent = sessions.slice(0, 3);

  return (
    <main className="start-page">
      <div className="start-hero">
        <span className="kicker">
         A research studio for food creators
        </span>
        <h1>
          What are you
          {/* <br /> */}
          <em> researching today?</em>
        </h1>
        {/* <p className="start-lede">
          Bring the searching into one place — photographs, recipes, local
          knowledge and the notes in your head — then carry it straight into a
          carousel.
        </p> */}
      </div>

      <section className="start-form" aria-label="Start a research session">
        <div className="start-form-fields">
          <label className="field field-lead">
            <span className="field-label">Dish or food topic</span>
            <input
              value={dish}
              onChange={(event) => onDishChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !loading) onSubmit();
              }}
              placeholder="ekpang nkukwo, mofongo, jollof rice…"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span className="field-label">Context or regional focus</span>
            <input
              value={context}
              onChange={(event) => onContextChange(event.target.value)}
              placeholder="Nigerian Ibibio, Traditional Puerto Rican…"
              autoComplete="off"
            />
          </label>
        </div>

        <fieldset className="field">
          <legend className="field-label">What kind of research is this?</legend>
          <div className="choice-row">
            {RESEARCH_KINDS.map((option) => (
              <button
                type="button"
                key={option}
                className={kind === option ? "choice choice-active" : "choice"}
                aria-pressed={kind === option}
                onClick={() => onKindChange(option)}
              >
                {kind === option && <Check size={13} />}
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="start-form-extra">
          <button type="button" className="disclosure" onClick={onToggleExtra} aria-expanded={showExtra}>
            {showExtra ? <ChevronDown size={15} /> : <Plus size={15} />}
            {showExtra ? "Hide additional instructions" : "Add additional instructions"}
            <span>Optional</span>
          </button>
          {showExtra && (
            <label className="field">
              <span className="sr-only">Additional instructions</span>
              <textarea
                value={extra}
                onChange={(event) => onExtraChange(event.target.value)}
                placeholder="Anything the research should pay extra attention to…"
                rows={3}
              />
            </label>
          )}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="start-form-footer">
          <div className="model-inline">
            {/* <span className="model-dot" aria-hidden="true" /> */}
            {/* <span>
              <small>Synthesis model</small>
              <strong>{modelLabel(model)}</strong>
            </span> */}
            {/* <select
              className="model-inline-select"
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
              aria-label="Synthesis model"
            >
              {MODELS.map((option) => (
                <option key={option.id} value={option.id} disabled={!option.available}>
                  {option.name}
                  {option.available ? "" : " — unavailable"}
                </option>
              ))}
            </select>
            {model !== DEFAULT_MODEL_ID && (
              <button className="model-reset" onClick={() => onModelChange(DEFAULT_MODEL_ID)}>
                Reset
              </button>
            )} */}
          </div>

          <button className="button button-primary" onClick={onSubmit} disabled={loading || !dish.trim()}>
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {phase === "analyzing" ? "Reading the sources…" : "Searching…"}
              </>
            ) : (
              <>
                Start research <ArrowRight size={16} />
              </>
            )}
          </button>
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
                onKindChange(idea.kind);
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
            <span className="eyebrow">Your workspace</span>
            <h2>Recent research</h2>
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
                      {session.context || "No context"} ·{" "}
                      {session.pack?.visuals?.length ?? 0} saved
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
