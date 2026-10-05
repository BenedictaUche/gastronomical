"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { ResearchOverview } from "./ResearchOverview";
import { RecipeCards } from "./RecipeCards";
import { Comparison } from "./Comparison";
import { VisualGallery } from "./VisualGallery";
import { SourceLibrary } from "./SourceLibrary";
import type {
  AnalysisData,
  ResearchImage,
  ResearchPack,
  ResearchSource,
  SavedFinding,
  ShotNote,
} from "@/lib/studio";

type WorkspaceProps = {
  dish: string;
  context: string;
  kind: string;
  images: ResearchImage[];
  sources: ResearchSource[];
  warning?: string | null;
  pack: ResearchPack;
  analysis: AnalysisData | null;
  analysisBusy: boolean;
  analysisError: string | null;
  reanalyzing: boolean;
  savedSession: boolean;
  onNewResearch: () => void;
  onReanalyze: () => void;
  onSaveSession: () => void;
  onOpenPack: () => void;
  onPlan: () => void;
  onToggleVisual: (index: number) => void;
  onSetNote: (index: number, note: ShotNote | undefined) => void;
  onToggleSource: (index: number) => void;
  onToggleFinding: (finding: SavedFinding) => void;
};

export function Workspace({
  dish,
  context,
  kind,
  images,
  sources,
  warning,
  pack,
  analysis,
  analysisBusy,
  analysisError,
  reanalyzing,
  savedSession,
  onNewResearch,
  onReanalyze,
  onSaveSession,
  onOpenPack,
  onPlan,
  onToggleVisual,
  onSetNote,
  onToggleSource,
  onToggleFinding,
}: WorkspaceProps) {
  const mainRef = useRef<HTMLElement>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const recipeCount = sources.filter(
    (source) => source.contentType === "recipe" || (source.ingredients?.length ?? 0) > 0,
  ).length;

  const jumpTo = (id: string) => {
    const target = mainRef.current?.querySelector(`#${CSS.escape(id)}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="workspace" ref={mainRef}>
      <button className="back-link" onClick={onNewResearch}>
        <ArrowLeft size={15} /> New search
      </button>

      <ResearchOverview
        dish={dish}
        context={context}
        kind={kind}
        summary={analysis?.summary ?? ""}
        analysisBusy={analysisBusy}
        analysisError={analysisError}
        reanalyzing={reanalyzing}
        pack={pack}
        savedSession={savedSession}
        recipeCount={recipeCount}
        onReanalyze={onReanalyze}
        onSaveSession={onSaveSession}
        onOpenPack={onOpenPack}
        onPlan={onPlan}
      />

      <nav className="section-jump" aria-label="Jump to section">
        {[
          { id: "recipes-heading", label: "Recipes" },
          { id: "compare-heading", label: "Differences" },
          { id: "visuals-heading", label: "Images" },
        ].map((jump) => (
          <button key={jump.id} onClick={() => jumpTo(jump.id)}>
            {jump.label}
          </button>
        ))}
        <button onClick={onOpenPack}>
          <span className="section-jump-dot" aria-hidden="true" />
          Pack ({pack.visuals.length + pack.sources.length + pack.findings.length + pack.notes.length})
        </button>
      </nav>

      <RecipeCards dish={dish} sources={sources} />

      <Comparison
        analysis={analysis}
        sources={sources}
        busy={analysisBusy}
        error={analysisError}
        pack={pack}
        onToggleFinding={onToggleFinding}
      />

      <VisualGallery
        dish={dish}
        images={images}
        pack={pack}
        notice={warning}
        onToggleSave={onToggleVisual}
        onSetNote={onSetNote}
      />

      <div className="mid-cta">
        <p>Images and recipes are ready to become a carousel.</p>
        <button className="button button-primary button-big" onClick={onPlan}>
          Create my carousel
        </button>
      </div>

      <section className="section section-sources-collapsed">
        <button
          className="sources-toggle"
          onClick={() => setSourcesOpen((open) => !open)}
          aria-expanded={sourcesOpen}
          aria-controls="sources-panel"
        >
          <span>
            <span className="eyebrow">Secondary</span>
            <strong>
              Sources used <span className="button-count">{sources.length}</span>
            </strong>
          </span>
          <ChevronDown size={16} className={sourcesOpen ? "chevron-on" : ""} aria-hidden="true" />
        </button>

        {sourcesOpen && (
          <div id="sources-panel">
            <SourceLibrary sources={sources} pack={pack} onToggleSave={onToggleSource} />
          </div>
        )}
      </section>
    </main>
  );
}
