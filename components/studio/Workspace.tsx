"use client";

import { useRef } from "react";
import { ArrowLeft, Compass, Images, NotebookPen, ScrollText, Sparkles } from "lucide-react";
import { ResearchOverview } from "./ResearchOverview";
import { VisualGallery } from "./VisualGallery";
import { SourceLibrary } from "./SourceLibrary";
import { Synthesis } from "./Synthesis";
import { NotesBoard } from "./NotesBoard";
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
  model: string;
  images: ResearchImage[];
  sources: ResearchSource[];
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
  onAddNote: (note: string) => void;
  onRemoveNote: (note: string) => void;
};

const JUMPS = [
  { id: "visuals-heading", label: "Photographs", icon: Images },
  { id: "sources-heading", label: "Sources", icon: ScrollText },
  { id: "synthesis-heading", label: "Synthesis", icon: Sparkles },
  { id: "notes-heading", label: "Notes", icon: NotebookPen },
];

export function Workspace({
  dish,
  context,
  kind,
  model,
  images,
  sources,
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
  onAddNote,
  onRemoveNote,
}: WorkspaceProps) {
  const mainRef = useRef<HTMLElement>(null);

  const jumpTo = (id: string) => {
    const target = mainRef.current?.querySelector(`#${CSS.escape(id)}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="workspace" ref={mainRef}>
      <button className="back-link" onClick={onNewResearch}>
        <ArrowLeft size={15} /> New research
      </button>

      <ResearchOverview
        dish={dish}
        context={context}
        kind={kind}
        model={model}
        summary={analysis?.summary ?? ""}
        imageCount={images.length}
        sources={sources}
        analysisBusy={analysisBusy}
        analysisError={analysisError}
        reanalyzing={reanalyzing}
        pack={pack}
        savedSession={savedSession}
        onReanalyze={onReanalyze}
        onSaveSession={onSaveSession}
        onOpenPack={onOpenPack}
        onPlan={onPlan}
      />

      <nav className="section-jump" aria-label="Jump to section">
        <Compass size={14} aria-hidden="true" />
        {JUMPS.map((jump) => (
          <button key={jump.id} onClick={() => jumpTo(jump.id)}>
            <jump.icon size={13} aria-hidden="true" />
            {jump.label}
          </button>
        ))}
        <button onClick={onOpenPack}>
          <span className="section-jump-dot" aria-hidden="true" />
          Pack ({pack.visuals.length + pack.sources.length + pack.findings.length + pack.notes.length})
        </button>
      </nav>

      <VisualGallery
        dish={dish}
        images={images}
        pack={pack}
        onToggleSave={onToggleVisual}
        onSetNote={onSetNote}
      />

      <SourceLibrary sources={sources} pack={pack} onToggleSave={onToggleSource} />

      <Synthesis
        analysis={analysis}
        model={model}
        busy={analysisBusy}
        error={analysisError}
        reanalyzing={reanalyzing}
        pack={pack}
        onReanalyze={onReanalyze}
        onToggleFinding={onToggleFinding}
      />

      <NotesBoard notes={pack.notes} onAdd={onAddNote} onRemove={onRemoveNote} />
{/*
      <footer className="workspace-foot">
        <p>
          Everything above came from live search results. Synthesised text is
          generated from those results and is worth checking against the sources
          before you publish.
        </p>
      </footer> */}
    </main>
  );
}
