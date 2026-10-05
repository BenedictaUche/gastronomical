"use client";

import { Bookmark, Check, ChevronRight, RefreshCw } from "lucide-react";
import { packSize } from "@/lib/studio";
import type { ResearchPack } from "@/lib/studio";

type ResearchOverviewProps = {
  dish: string;
  context: string;
  kind: string;
  summary: string;
  analysisBusy: boolean;
  analysisError: string | null;
  reanalyzing: boolean;
  pack: ResearchPack;
  savedSession: boolean;
  recipeCount: number;
  onReanalyze: () => void;
  onSaveSession: () => void;
  onOpenPack: () => void;
  onPlan: () => void;
};

export function ResearchOverview({
  dish,
  context,
  kind,
  summary,
  analysisBusy,
  analysisError,
  reanalyzing,
  pack,
  savedSession,
  recipeCount,
  onReanalyze,
  onSaveSession,
  onOpenPack,
  onPlan,
}: ResearchOverviewProps) {
  const count = packSize(pack);

  return (
    <section className="overview overview-slim" aria-labelledby="overview-heading">
      <div className="overview-main">
        <div className="overview-meta">
          <span className="meta-chip">{kind}</span>
          {context && <span className="meta-chip meta-chip-quiet">{context}</span>}
        </div>

        <h1 id="overview-heading">{dish}</h1>

        {analysisBusy ? (
          <p className="overview-summary">
            <span className="spinner spinner-dark" aria-hidden="true" /> Reading the
            sources…
          </p>
        ) : summary ? (
          <p className="overview-summary">{summary}</p>
        ) : analysisError ? (
          <p className="overview-summary overview-summary-muted">{analysisError}</p>
        ) : null}

        <div className="overview-actions overview-actions-main">
          <button className="button button-primary button-big" onClick={onPlan}>
            Create my carousel
            <ChevronRight size={16} />
          </button>

          <button
            className={savedSession ? "button button-quiet button-quiet-done" : "button button-quiet"}
            onClick={onSaveSession}
            disabled={savedSession}
          >
            {savedSession ? <Check size={14} /> : <Bookmark size={14} />}
            {savedSession ? "Project saved" : "Save project"}
          </button>

          <button className="button button-quiet" onClick={onOpenPack}>
            My content pack
            <span className="button-count">{count}</span>
          </button>

          {analysisError && (
            <button className="button button-quiet" onClick={onReanalyze} disabled={reanalyzing}>
              {reanalyzing ? (
                <span className="spinner spinner-dark" aria-hidden="true" />
              ) : (
                <RefreshCw size={14} />
              )}
              Try the summary again
            </button>
          )}
        </div>

        <p className="overview-footnote">
          {recipeCount > 0
            ? `${recipeCount} recipe${recipeCount === 1 ? "" : "s"} found in the sources below.`
            : "No structured recipes yet — the sources below may still describe how it is made."}
        </p>
      </div>
    </section>
  );
}
