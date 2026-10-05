"use client";

import { useCallback, useEffect, useState } from "react";
import { TopBar, type StudioView } from "@/components/studio/TopBar";
import { StartView } from "@/components/studio/StartView";
import { Workspace } from "@/components/studio/Workspace";
import { SavedSessionsView } from "@/components/studio/SavedSessionsView";
import { ResearchPackDrawer } from "@/components/studio/ResearchPackDrawer";
import { CarouselPlanner } from "@/components/studio/CarouselPlanner";
import {
  DEFAULT_MODEL_ID,
  DEFAULT_CONTENT_TYPE,
  MAX_SESSIONS,
  emptyPack,
  loadSessions,
  migrateSlide,
  persistSessions,
  type AnalysisData,
  type CarouselSlide,
  type ResearchImage,
  type ResearchPack,
  type ResearchSource,
  type SavedFinding,
  type SavedSession,
  type ShotNote,
} from "@/lib/studio";

type ResearchPayload = {
  images: ResearchImage[];
  sources: ResearchSource[];
  warnings?: string[];
};

/** Content type → default carousel type. Falls back to discovery. */
const DEFAULT_CAROUSEL_TYPE: Record<string, string> = {
  Recipe: "recipe",
  "Food discovery": "discovery",
  "Recipe roundup": "roundup",
  "Things to know": "things",
  "Ingredients & techniques": "ingredients",
};

export default function Page() {
  const [view, setView] = useState<StudioView>("home");
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  /* research brief */
  const [dish, setDish] = useState("");
  const [context, setContext] = useState("");
  const [kind, setKind] = useState<string>(DEFAULT_CONTENT_TYPE);
  const [extra, setExtra] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL_ID);

  /* live research */
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"searching" | "analyzing" | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchWarning, setResearchWarning] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [research, setResearch] = useState<ResearchPayload | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  /* research pack */
  const [pack, setPack] = useState<ResearchPack>(emptyPack);
  const [packOpen, setPackOpen] = useState(false);
  const [packCopied, setPackCopied] = useState(false);
  const [savedSession, setSavedSession] = useState(false);

  /* carousel */
  const [carouselType, setCarouselType] = useState("recipe");
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [carouselCopied, setCarouselCopied] = useState(false);
  const [carouselSaved, setCarouselSaved] = useState(false);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const images = research?.images ?? [];
  const sources = research?.sources ?? [];
  const hasSession = research !== null;
  const analysisBusy = phase === "analyzing" || reanalyzing;

  const resetSession = useCallback(() => {
    setResearch(null);
    setAnalysis(null);
    setAnalysisError(null);
    setResearchWarning(null);
    setPack(emptyPack());
    setSavedSession(false);
    setPackOpen(false);
    setSlides([]);
    setCarouselTitle("");
    setCarouselError(null);
    setCarouselSaved(false);
    setRegeneratingIndex(null);
  }, []);

  const requestAnalysis = async (target: ResearchSource[], topic: string, contextText: string) => {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dish: topic, context: contextText, sources: target, model }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    return data as { analysis: AnalysisData; model?: string };
  };

  const startResearch = async () => {
    if (!dish.trim() || loading) return;

    // A new query must never surface anything from the previous one.
    resetSession();
    setResearchError(null);
    setLoading(true);
    setPhase("searching");
    setCarouselType(DEFAULT_CAROUSEL_TYPE[kind] ?? "discovery");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish, context, kind, extra }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed. Please try again.");
      }

      // A search that came back half-empty is still shown, with the reason the
      // route reported rather than a guess.
      const warnings: string[] = Array.isArray(data.warnings)
        ? data.warnings.filter((warning: unknown): warning is string => typeof warning === "string")
        : [];

      const payload: ResearchPayload = {
        images: Array.isArray(data.images) ? data.images : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
        warnings,
      };

      setResearch(payload);
      setResearchWarning(warnings[0] ?? null);
      setView("workspace");

      if (payload.sources.length === 0) {
        setAnalysisError(
          warnings[0] ??
            "No web sources came back for this search, so there is nothing to compare yet.",
        );
        return;
      }

      setPhase("analyzing");

      try {
        const result = await requestAnalysis(payload.sources, dish, context);
        setAnalysis(result.analysis);
      } catch {
        setAnalysisError(
          "The sources came back, but the comparison could not be written. The recipes below are still usable.",
        );
      }
    } catch (error) {
      setResearchError(
        error instanceof Error ? error.message : "Search failed. Please try again.",
      );
    } finally {
      setLoading(false);
      setPhase(null);
    }
  };

  const runReanalysis = async () => {
    if (!research || reanalyzing) return;

    setReanalyzing(true);
    setAnalysisError(null);

    try {
      const result = await requestAnalysis(research.sources, dish, context);
      setAnalysis(result.analysis);
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "The model could not finish the analysis.",
      );
    } finally {
      setReanalyzing(false);
    }
  };

  /* ------------------------------- pack actions ------------------------------ */

  const toggleVisual = (index: number) =>
    setPack((current) => ({
      ...current,
      visuals: current.visuals.includes(index)
        ? current.visuals.filter((value) => value !== index)
        : [...current.visuals, index].sort((a, b) => a - b),
    }));

  const setVisualNote = (index: number, note: ShotNote | undefined) =>
    setPack((current) => {
      const imageNotes = { ...current.imageNotes };
      if (note) imageNotes[index] = note;
      else delete imageNotes[index];
      return { ...current, imageNotes };
    });

  const toggleSource = (index: number) =>
    setPack((current) => ({
      ...current,
      sources: current.sources.includes(index)
        ? current.sources.filter((value) => value !== index)
        : [...current.sources, index].sort((a, b) => a - b),
    }));

  const toggleFinding = (finding: SavedFinding) =>
    setPack((current) => ({
      ...current,
      findings: current.findings.some((item) => item.id === finding.id)
        ? current.findings.filter((item) => item.id !== finding.id)
        : [...current.findings, finding],
    }));

  const removeNote = (note: string) =>
    setPack((current) => ({ ...current, notes: current.notes.filter((item) => item !== note) }));

  /* -------------------------------- sessions --------------------------------- */

  const saveSession = (packOverride?: ResearchPack, carouselSlides?: CarouselSlide[]) => {
    if (!research) return;

    const activePack = packOverride ?? pack;

    // A carousel saved on the plan screen travels with the project too.
    const session: SavedSession = {
      id: `${Date.now()}`,
      dish,
      context,
      kind,
      extra,
      model,
      savedAt: new Date().toISOString(),
      images: research.images,
      sources: research.sources,
      analysis,
      pack:
        carouselSlides && carouselSlides.length > 0
          ? {
              ...activePack,
              carousel: {
                title: carouselTitle || `${dish} carousel`,
                type: carouselType,
                slides: carouselSlides,
                savedAt: new Date().toISOString(),
              },
            }
          : activePack,
    };

    // Replace any earlier save of the same dish rather than piling up copies.
    const next = [session, ...sessions.filter((item) => item.dish !== session.dish)].slice(
      0,
      MAX_SESSIONS,
    );

    setSessions(next);
    persistSessions(next);
    setSavedSession(true);
  };

  const openSession = (session: SavedSession) => {
    resetSession();
    setDish(session.dish);
    setContext(session.context ?? "");
    setKind(session.kind || DEFAULT_CONTENT_TYPE);
    setExtra(session.extra ?? "");
    setModel(session.model || DEFAULT_MODEL_ID);
    setResearch({ images: session.images ?? [], sources: session.sources ?? [] });
    setAnalysis(session.analysis ?? null);
    setPack(session.pack);
    setSavedSession(true);

    // Reopen the saved carousel exactly where she left it.
    const savedCarousel = session.pack?.carousel;
    if (savedCarousel && savedCarousel.slides.length > 0) {
      // Sessions saved before the full-bleed redesign carry a flat body and a
      // legacy layout, so bring them up to the current shape rather than
      // discarding them.
      setSlides(
        savedCarousel.slides.map((slide, index, all) =>
          migrateSlide(slide as Partial<CarouselSlide>, index, all.length, {
            style: "editorial",
            focus: "center",
            imageIndex: null,
          }),
        ),
      );
      setCarouselTitle(savedCarousel.title || "");
      setCarouselType(savedCarousel.type || "recipe");
      setCarouselSaved(true);
    }

    setView("workspace");
  };

  const deleteSession = (id: string) => {
    const next = sessions.filter((session) => session.id !== id);
    setSessions(next);
    persistSessions(next);
  };

  const newResearch = () => {
    resetSession();
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ------------------------------ carousel creation --------------------------- */

  // The route returns content only; design is applied here and then editable.
  const normalizeSlides = (raw: unknown): CarouselSlide[] => {
    const source = Array.isArray(raw) ? raw : [];
    const defaults = {
      style: "editorial" as const,
      focus: "center" as const,
      imageIndex: null,
    };

    return source.map((slide: Record<string, unknown>, index: number) =>
      migrateSlide(slide, index, source.length, defaults),
    );
  };

  const generateCarousel = async (regenerateIndex?: number) => {
    if (!research) return;

    const indexProvided = typeof regenerateIndex === "number";
    if (indexProvided) setRegeneratingIndex(regenerateIndex);
    else setGenerating(true);
    setCarouselError(null);

    // Grounding: the recipes and sources this search actually retrieved.
    const recipeSources = sources.filter(
      (source) =>
        source.contentType === "recipe" ||
        (source.ingredients?.length ?? 0) > 0 ||
        (source.instructions?.length ?? 0) > 0,
    );

    try {
      const response = await fetch("/api/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish,
          context,
          type: carouselType,
          model,
          regenerateIndex: indexProvided ? regenerateIndex : undefined,
          recipes: recipeSources.slice(0, 6).map((source) => ({
            title: source.title || "",
            source: source.source || "",
            author: source.author || "",
            yield: source.yield || "",
            prepTime: source.prepTime || "",
            cookTime: source.cookTime || "",
            ingredients: source.ingredients ?? [],
            instructions: source.instructions ?? [],
          })),
          findings: pack.findings.map((finding) => ({
            text: finding.text,
            sources: finding.sources,
          })),
          notes: pack.notes,
          sources: sources.slice(0, 12).map((source) => ({
            title: source.title || "Untitled source",
            source: source.source || "",
            text: (source.content || source.snippet || "").slice(0, 600),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create the carousel.");
      }

      const incoming = normalizeSlides(data.slides);

      if (indexProvided && typeof data.regenerateIndex === "number") {
        // Swap only the regenerated slide; the rest stay as she edited them.
        const target = data.regenerateIndex;
        setSlides((current) =>
          current.map((slide, position) =>
            position === target && incoming[0] ? { ...incoming[0], id: slide.id } : slide,
          ),
        );
      } else {
        setSlides(incoming);
        if (data.title) setCarouselTitle(data.title);
        setCarouselSaved(false);
      }
    } catch (error) {
      setCarouselError(
        error instanceof Error ? error.message : "Could not create the carousel.",
      );
    } finally {
      if (indexProvided) setRegeneratingIndex(null);
      else setGenerating(false);
    }
  };

  const saveCarousel = () => {
    if (slides.length === 0) return;

    const nextPack: ResearchPack = {
      ...pack,
      carousel: {
        title: carouselTitle || `${dish} carousel`,
        type: carouselType,
        slides,
        savedAt: new Date().toISOString(),
      },
    };

    setPack(nextPack);
    setCarouselSaved(true);
    saveSession(nextPack);
  };

  const copyCarousel = async () => {
    const text = [
      carouselTitle || dish,
      "",
      ...slides.flatMap((slide, index) => [
        `SLIDE ${index + 1} — ${slide.title || "(untitled)"}`,
        slide.body,
        "",
      ]),
    ].join("\n");

    await navigator.clipboard?.writeText(text);
    setCarouselCopied(true);
    window.setTimeout(() => setCarouselCopied(false), 1800);
  };

  const copyPack = async () => {
    const lines = [
      `CONTENT PACK — ${dish}`,
      "",
      `IMAGES (${pack.visuals.length})`,
      ...pack.visuals.map((index) => {
        const image = images[index];
        return image ? `- ${image.title || "Untitled"} — ${image.source || ""} ${image.link || ""}` : "";
      }),
      "",
      `SOURCES (${pack.sources.length})`,
      ...pack.sources.map((index) => {
        const source = sources[index];
        return source ? `- ${source.title || "Untitled"} — ${source.url || ""}` : "";
      }),
      "",
      `FINDINGS (${pack.findings.length})`,
      ...pack.findings.map((finding) => `- ${finding.text}`),
      "",
      `NOTES (${pack.notes.length})`,
      ...pack.notes.map((note) => `- ${note}`),
    ];

    await navigator.clipboard?.writeText(lines.join("\n"));
    setPackCopied(true);
    window.setTimeout(() => setPackCopied(false), 1800);
  };

  const navigate = (next: StudioView) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <TopBar
        view={view}
        onNavigate={navigate}
        pack={pack}
        hasSession={hasSession}
        onOpenPack={() => setPackOpen(true)}
      />

      {view === "home" && (
        <StartView
          dish={dish}
          context={context}
          kind={kind}
          extra={extra}
          model={model}
          loading={loading}
          phase={phase}
          error={researchError}
          sessions={sessions}
          onDishChange={setDish}
          onContextChange={setContext}
          onKindChange={setKind}
          onExtraChange={setExtra}
          onModelChange={setModel}
          onSubmit={startResearch}
          onOpenSession={openSession}
        />
      )}

      {view === "workspace" && research && (
        <Workspace
          dish={dish}
          context={context}
          kind={kind}
          images={images}
          sources={sources}
          warning={researchWarning}
          pack={pack}
          analysis={analysis}
          analysisBusy={analysisBusy}
          analysisError={analysisError}
          reanalyzing={reanalyzing}
          savedSession={savedSession}
          onNewResearch={newResearch}
          onReanalyze={runReanalysis}
          onSaveSession={() => saveSession()}
          onOpenPack={() => setPackOpen(true)}
          onPlan={() => navigate("plan")}
          onToggleVisual={toggleVisual}
          onSetNote={setVisualNote}
          onToggleSource={toggleSource}
          onToggleFinding={toggleFinding}
        />
      )}

      {view === "saved" && (
        <SavedSessionsView
          sessions={sessions}
          onOpen={openSession}
          onDelete={deleteSession}
          onGoStart={newResearch}
        />
      )}

      {view === "plan" && (
        <CarouselPlanner
          hasSession={hasSession}
          dish={dish}
          context={context}
          pack={pack}
          images={images}
          title={carouselTitle}
          slides={slides}
          type={carouselType}
          generating={generating}
          regeneratingIndex={regeneratingIndex}
          error={carouselError}
          copied={carouselCopied}
          carouselSaved={carouselSaved}
          onTypeChange={setCarouselType}
          onGenerate={() => generateCarousel()}
          onRegenerateSlide={(index) => generateCarousel(index)}
          onTitleChange={setCarouselTitle}
          onSlidesChange={(next) => {
            setSlides(next);
            setCarouselSaved(false);
          }}
          onCopy={copyCarousel}
          onSaveCarousel={saveCarousel}
          onGoStart={newResearch}
        />
      )}

      <ResearchPackDrawer
        open={packOpen}
        onClose={() => setPackOpen(false)}
        dish={dish}
        pack={pack}
        images={images}
        sources={sources}
        copied={packCopied}
        onCopy={copyPack}
        onRemoveVisual={toggleVisual}
        onRemoveSource={toggleSource}
        onRemoveFinding={(id) =>
          setPack((current) => ({
            ...current,
            findings: current.findings.filter((finding) => finding.id !== id),
          }))
        }
        onRemoveNote={removeNote}
        onClear={() => setPack(emptyPack())}
        onPlan={() => {
          setPackOpen(false);
          navigate("plan");
        }}
      />
    </div>
  );
}
