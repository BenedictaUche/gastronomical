"use client";

import { Bookmark, Check, RefreshCw, Sparkles } from "lucide-react";
import { modelLabel, packSize, sourceType } from "@/lib/studio";
import type { ResearchPack, ResearchSource } from "@/lib/studio";

type ResearchOverviewProps = {
  dish: string;
  context: string;
  kind: string;
  model: string;
  summary: string;
  imageCount: number;
  sources: ResearchSource[];
  analysisBusy: boolean;
  analysisError: string | null;
  reanalyzing: boolean;
  pack: ResearchPack;
  savedSession: boolean;
  onReanalyze: () => void;
  onSaveSession: () => void;
  onOpenPack: () => void;
  onPlan: () => void;
};

export function ResearchOverview({
  dish,
  context,
  kind,
  model,
  summary,
  imageCount,
  sources,
  analysisBusy,
  analysisError,
  reanalyzing,
  pack,
  savedSession,
  onReanalyze,
  onSaveSession,
  onOpenPack,
  onPlan,
}: ResearchOverviewProps) {
  const recipeCount = sources.filter((source) => sourceType(source) === "recipe").length;
  const contextCount = sources.filter((source) => sourceType(source) !== "recipe").length;
  const count = packSize(pack);

  return (
    <section className="overview" aria-labelledby="overview-heading">
      <div className="overview-main">
        {/* <span className="eyebrow">Researching</span> */}
        <h1 id="overview-heading">{dish}</h1>
        <p className="overview-context">{context || "No regional or cultural focus given"}</p>

        <div className="overview-meta">
          <span className="meta-chip">{kind}</span>
          {/* <span className="meta-chip meta-chip-quiet">
            <Sparkles size={12} /> {modelLabel(model)}
          </span> */}
        </div>

        <div className="overview-counts">
          <div className="count">
            <strong>{imageCount}</strong>
            <span>visual references</span>
          </div>
          <div className="count">
            <strong>{sources.length}</strong>
            <span>sources found</span>
          </div>
          <div className="count">
            <strong>{recipeCount}</strong>
            <span>with recipe data</span>
          </div>
          <div className="count">
            <strong>{contextCount}</strong>
            <span>articles & posts</span>
          </div>
        </div>
      </div>

      <div className="overview-side">
        <span className="eyebrow">Research summary</span>
        {analysisBusy ? (
          <p className="overview-summary">
            <span className="spinner spinner-dark" aria-hidden="true" /> Reading the collected
            sources…
          </p>
        ) : summary ? (
          <p className="overview-summary">{summary}</p>
        ) : (
          <p className="overview-summary overview-summary-muted">
            {analysisError ??
              "No synthesis yet. The sources below are still usable evidence on their own."}
          </p>
        )}

        <div className="overview-actions">
          <button className="button button-primary" onClick={onOpenPack}>
            Research pack
            <span className="button-count">{count}</span>
          </button>
          <button className="button button-quiet" onClick={onPlan}>
            Plan a carousel
          </button>
          <button
            className={savedSession ? "button button-quiet button-quiet-done" : "button button-quiet"}
            onClick={onSaveSession}
            disabled={savedSession}
          >
            {savedSession ? <Check size={14} /> : <Bookmark size={14} />}
            {savedSession ? "Session saved" : "Save session"}
          </button>
          <button
            className="button button-quiet"
            onClick={onReanalyze}
            disabled={reanalyzing || !sources.length}
          >
            {reanalyzing ? (
              <span className="spinner spinner-dark" aria-hidden="true" />
            ) : (
              <RefreshCw size={14} />
            )}
            Re-analyse
          </button>
        </div>
      </div>
    </section>
  );
}
