"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Download,
  ExternalLink,
  Leaf,
  Menu,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  Star,
  X,
  WandSparkles,
} from "lucide-react";

/* ---------------------------------- types --------------------------------- */

type ResearchImage = {
  position?: number;
  title?: string;
  source?: string;
  thumbnail?: string;
  original?: string;
  link?: string;
};

type ResearchSource = {
  position?: number;
  title?: string;
  source?: string;
  url?: string;
  snippet?: string;
  content?: string;
  contentType?: string;
  ingredients?: string[];
  instructions?: string[];
  cookTime?: string;
  yield?: string;
};

type AnalysisData = {
  summary: string;
  commonIngredients: {
    ingredient: string;
    sourceCount: number;
    sourceTitles: string[];
  }[];
  differences: {
    topic: string;
    details: string;
    sourceTitles: string[];
  }[];
  techniques: {
    technique: string;
    details: string;
    sourceTitles: string[];
  }[];
  observations: {
    observation: string;
    sourceTitles: string[];
  }[];
};

type SavedSession = {
  id: string;
  dish: string;
  context: string;
  kind: string;
  model: string;
  savedAt: string;
  images: ResearchImage[];
  sources: ResearchSource[];
  analysis: AnalysisData | null;
  brief: {
    visuals: number[];
    sources: number[];
    findings: string[];
    notes: string;
  };
};

/* -------------------------------- constants ------------------------------- */

// Only the Qwen model is actually wired up to /api/analyze right now.
// The other options stay visible but are marked unavailable so the selector
// never pretends to offer something that isn't implemented.
const models = [
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen 3.8 27B",
    description: "Open-weight · Active for analysis",
    available: true,
  },
  {
    id: "gemma-4",
    name: "Gemma 4",
    description: "Unavailable — not wired up yet",
    available: false,
  },
  {
    id: "mistral",
    name: "Mistral",
    description: "Unavailable — not wired up yet",
    available: false,
  },
  {
    id: "llama",
    name: "Llama",
    description: "Unavailable — not wired up yet",
    available: false,
  },
];

const DEFAULT_MODEL_ID = "qwen/qwen3.8-27b:free";

const modelLabel = (id: string) =>
  models.find((m) => m.id === id)?.name ?? id;

const researchKinds = [
  "Recipe",
  "Recipe roundup",
  "Food discovery",
  "Just researching",
];

const SESSIONS_KEY = "gastronomical-sessions";
const contentTypeLabel = (type?: string) =>
  type === "recipe"
    ? "Recipe"
    : type === "article"
      ? "Article"
      : type === "social"
        ? "Social post"
        : "Web source";

function loadSessions(): SavedSession[] {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedSession =>
        item && typeof item.dish === "string" && Array.isArray(item.sources),
    );
  } catch {
    return [];
  }
}

function splitSummary(summary: string): { headline: string; rest: string } {
  const match = summary.match(/^([\s\S]*?[.!?])(\s+[\s\S]*)?$/);
  if (!match) return { headline: summary, rest: "" };
  return { headline: match[1], rest: (match[2] ?? "").trim() };
}

/* ---------------------------------- page ---------------------------------- */

export default function Page() {
  const [view, setView] = useState<"home" | "research" | "saved">("home");
  const [dish, setDish] = useState("");
  const [context, setContext] = useState("");
  const [kind, setKind] = useState("Recipe");
  const [extra, setExtra] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [modelOpen, setModelOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"searching" | "analyzing" | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [researchData, setResearchData] = useState<{
    images: ResearchImage[];
    sources: ResearchSource[];
  } | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisModel, setAnalysisModel] = useState("");

  const [selectedVisual, setSelectedVisual] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);

  const [savedVisuals, setSavedVisuals] = useState<number[]>([]);
  const [savedSources, setSavedSources] = useState<number[]>([]);
  const [savedFindings, setSavedFindings] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [savedSession, setSavedSession] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const images = researchData?.images ?? [];
  const sources = researchData?.sources ?? [];

  const visuals = useMemo(
    () =>
      images.map((image, index) => ({
        id: index,
        title:
          image.title || `${dish || "This dish"} — Google Images result`,
        source: image.source || "Google Images",
        imageUrl: image.thumbnail || image.original || "",
        originalUrl: image.original || image.thumbnail || "",
        sourceUrl: image.link || image.original || image.thumbnail || "",
      })),
    [images, dish],
  );

  const savedCount =
    savedVisuals.length +
    savedSources.length +
    savedFindings.length +
    (notes.trim() ? 1 : 0);

  const analysisBusy = phase === "analyzing" || reanalyzing;
  const activeAnalysisModel = analysisModel || modelLabel(model);

  const maxIngredientCount = Math.max(
    1,
    ...(analysisData?.commonIngredients ?? []).map((item) => item.sourceCount),
  );

  const summarySplit = useMemo(
    () => splitSummary(analysisData?.summary ?? ""),
    [analysisData],
  );

  const toggle = (
    list: number[],
    setList: (v: number[]) => void,
    index: number,
  ) =>
    setList(
      list.includes(index) ? list.filter((x) => x !== index) : [...list, index],
    );

  const toggleFinding = (text: string) =>
    setSavedFindings((current) =>
      current.includes(text)
        ? current.filter((f) => f !== text)
        : [...current, text],
    );

  const withSourceTitles = (titles: string[]) =>
    titles.length ? ` (Sources: ${titles.join(", ")})` : "";

  const resetResearchState = () => {
    setResearchData(null);
    setAnalysisData(null);
    setAnalysisModel("");
    setAnalysisError(null);
    setResearchError(null);
    setSelectedVisual(null);
    setSelectedSource(null);
    setSavedVisuals([]);
    setSavedSources([]);
    setSavedFindings([]);
    setNotes("");
    setSavedSession(false);
    setBriefOpen(false);
  };

  const requestAnalysis = async (sourcesToAnalyze: ResearchSource[]) => {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dish, context, sources: sourcesToAnalyze, model }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI analysis failed");
    }

    return data;
  };

  const startResearch = async () => {
    if (!dish.trim() || loading) return;

    // A new query must never show anything from the previous one.
    resetResearchState();
    setLoading(true);
    setPhase("searching");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish, context, kind, extra }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Research failed. Please try again.");
      }

      const nextResearch = {
        images: Array.isArray(data.images) ? data.images : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
      };

      setResearchData(nextResearch);
      setView("research");

      if (nextResearch.sources.length) {
        setPhase("analyzing");

        try {
          const analysisResult = await requestAnalysis(nextResearch.sources);
          setAnalysisData(analysisResult.analysis);
          setAnalysisModel(analysisResult.model || "");
        } catch {
          setAnalysisError(
            "Sources found, but AI analysis couldn't be completed.",
          );
        }
      } else {
        setAnalysisError(
          "No web sources were found for this search, so there is nothing to analyze yet.",
        );
      }
    } catch (error) {
      setResearchError(
        error instanceof Error
          ? error.message
          : "Research failed. Please try again.",
      );
    } finally {
      setLoading(false);
      setPhase(null);
    }
  };

  const runReanalysis = async () => {
    if (!sources.length || reanalyzing) return;

    setReanalyzing(true);
    setAnalysisError(null);

    try {
      const analysisResult = await requestAnalysis(sources);
      setAnalysisData(analysisResult.analysis);
      setAnalysisModel(analysisResult.model || "");
    } catch {
      setAnalysisError(
        "Sources found, but AI analysis couldn't be completed.",
      );
    } finally {
      setReanalyzing(false);
    }
  };

  const saveSession = () => {
    if (!researchData) return;

    const session: SavedSession = {
      id: `${Date.now()}`,
      dish,
      context,
      kind,
      model,
      savedAt: new Date().toISOString(),
      images: researchData.images,
      sources: researchData.sources,
      analysis: analysisData,
      brief: {
        visuals: savedVisuals,
        sources: savedSources,
        findings: savedFindings,
        notes,
      },
    };

    const next = [session, ...sessions].slice(0, 12);
    setSessions(next);

    try {
      window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode / quota); keep the UI working.
    }

    setSavedSession(true);
  };

  const openSession = (session: SavedSession) => {
    resetResearchState();
    setDish(session.dish);
    setContext(session.context);
    setKind(session.kind || "Recipe");
    setModel(session.model || DEFAULT_MODEL_ID);
    setResearchData({
      images: session.images ?? [],
      sources: session.sources ?? [],
    });
    setAnalysisData(session.analysis ?? null);
    setSavedVisuals(session.brief?.visuals ?? []);
    setSavedSources(session.brief?.sources ?? []);
    setSavedFindings(session.brief?.findings ?? []);
    setNotes(session.brief?.notes ?? "");
    setSavedSession(true);
    setView("research");
  };

  const briefText = useMemo(() => {
    const lines: string[] = [
      "FOOD RESEARCH",
      "",
      dish || "Untitled research",
      context,
      `Research type: ${kind}`,
      `Research model: ${modelLabel(model)}`,
    ];

    if (analysisData?.summary) {
      lines.push("", "SUMMARY", analysisData.summary);
    }

    lines.push("", "MY NOTES", notes.trim() || "No notes added.");

    lines.push(
      "",
      "SAVED VISUAL REFERENCES",
      savedVisuals.map((i) => {
        const v = visuals[i];
        return v ? `- ${v.title} — ${v.source} (${v.sourceUrl})` : "";
      }).filter(Boolean).join("\n") || "None",
    );

    lines.push(
      "",
      "SAVED RESEARCH SOURCES",
      savedSources.map((i) => {
        const s = sources[i];
        if (!s) return "";
        return `- ${s.title || "Untitled source"} — ${s.source || "Web"}${s.url ? ` (${s.url})` : ""}`;
      }).filter(Boolean).join("\n") || "None",
    );

    lines.push(
      "",
      "SAVED FINDINGS",
      savedFindings.join("\n") || "None",
    );

    return lines.join("\n");
  }, [
    analysisData,
    context,
    dish,
    kind,
    model,
    notes,
    savedFindings,
    savedSources,
    savedVisuals,
    sources,
    visuals,
  ]);

  const copyBrief = async () => {
    await navigator.clipboard?.writeText(briefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadBrief = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([briefText], { type: "text/plain" }));
    a.download = `${(dish || "research").toLowerCase().replaceAll(" ", "-")}-research-brief.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const clearBrief = () => {
    setSavedVisuals([]);
    setSavedSources([]);
    setSavedFindings([]);
    setNotes("");
    setClearOpen(false);
  };

  const recentSessions = sessions.slice(0, 3);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("home")}>
          <span className="brand-mark">
            <Leaf size={16} />
          </span>
          <span>Food Research</span>
        </button>
        <nav>
          <button
            className={view !== "saved" ? "nav-active" : ""}
            onClick={() => setView("home")}
          >
            Research
          </button>
          <button
            className={view === "saved" ? "nav-active" : ""}
            onClick={() => setView("saved")}
          >
            Saved research
          </button>
        </nav>
        <div className="header-actions">
          <div className="model-wrap">
            <button
              className="model-trigger"
              onClick={() => setModelOpen(!modelOpen)}
            >
              <span className="model-dot" />
              {modelLabel(model)}
              <ChevronDown size={14} />
            </button>
            {modelOpen && (
              <div className="model-menu">
                <p className="eyebrow">Research model</p>
                {models.map((m) => (
                  <button
                    key={m.id}
                    className={
                      model === m.id ? "model-option selected" : "model-option"
                    }
                    disabled={!m.available}
                    onClick={() => {
                      setModel(m.id);
                      setModelOpen(false);
                    }}
                  >
                    <span>
                      <strong>{m.name}</strong>
                      <small>{m.description}</small>
                    </span>
                    {model === m.id && <Check size={15} />}
                  </button>
                ))}
                <p className="model-note">
                  Only models marked active are wired up for analysis right now.
                </p>
              </div>
            )}
          </div>
          <button className="icon-button mobile-menu" aria-label="Menu">
            <Menu size={18} />
          </button>
        </div>
      </header>

      {view === "home" && (
        <main className="home-page">
          <div className="home-intro">
            <span className="kicker">
              <Sparkles size={14} /> Research workspace for food creators
            </span>
            <h1>
              Food research,
              <br />
              <em>without the rabbit hole.</em>
            </h1>
            <p>
              Find useful recipes, visual references, and context for your next
              food post.
            </p>
          </div>
          <section className="research-form">
            <div className="form-heading">
              <div>
                <span className="eyebrow">Start a new session</span>
                <h2>What are you curious about?</h2>
              </div>
              <span className="step-label">
                01 <span>/ 03</span>
              </span>
            </div>
            <div className="field-grid">
              <label>
                <span>What are you researching?</span>
                <input
                  value={dish}
                  onChange={(e) => setDish(e.target.value)}
                  placeholder="e.g. Mofongo, ekpang nkukwo, jollof rice..."
                />
              </label>
              <label>
                <span>What context matters?</span>
                <input
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Traditional Puerto Rican, Nigerian Ibibio..."
                />
              </label>
            </div>
            <fieldset>
              <legend>What are you researching for?</legend>
              <div className="choice-row">
                {researchKinds.map((x) => (
                  <button
                    type="button"
                    key={x}
                    className={kind === x ? "choice active" : "choice"}
                    onClick={() => setKind(x)}
                  >
                    {kind === x && <Check size={14} />}
                    {x}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="additional">
              <button
                type="button"
                className="additional-toggle"
                onClick={() => setShowExtra(!showExtra)}
              >
                {showExtra ? <ChevronDown size={16} /> : <Plus size={16} />}
                {showExtra ? "More context" : "Add more context"}
                <span>Optional</span>
              </button>
              {showExtra && (
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Anything else you want the research to consider?"
                />
              )}
            </div>
            {researchError && (
              <p className="form-error" role="alert">
                {researchError}
              </p>
            )}
            <div className="form-footer">
              <div className="model-summary">
                <span className="model-dot" />
                <span>
                  <small>Research model</small>
                  <strong>{modelLabel(model)}</strong>
                </span>
                <button onClick={() => setModelOpen(true)}>
                  <ChevronDown size={14} />
                </button>
              </div>
              <button
                className="primary-button"
                onClick={startResearch}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    {phase === "analyzing"
                      ? "Analyzing sources"
                      : "Researching"}
                  </>
                ) : (
                  <>
                    Research <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </section>
          <button
            className="example-link"
            onClick={() => {
              setDish("Mofongo");
              setContext("Traditional Puerto Rican");
              setKind("Recipe");
              setShowExtra(true);
              setExtra(
                "Focus on traditional presentation and recipes from food creators or local sources.",
              );
            }}
          >
            <WandSparkles size={15} /> Try an example <ArrowRight size={14} />
          </button>
          {recentSessions.length > 0 && (
            <div className="recent">
              <div>
                <span className="eyebrow">Your workspace</span>
                <h3>Recent research</h3>
              </div>
              <div className="recent-items">
                {recentSessions.map((session) => (
                  <button key={session.id} onClick={() => openSession(session)}>
                    <span
                      className="recent-thumb"
                      style={
                        session.images?.[0]?.thumbnail
                          ? {
                              backgroundImage: `url(${session.images[0].thumbnail})`,
                            }
                          : undefined
                      }
                    />
                    <span>
                      <strong>{session.dish}</strong>
                      <small>{session.context || "No context"}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {view === "saved" && (
        <SavedResearch sessions={sessions} onOpen={openSession} />
      )}

      {view === "research" && researchData && (
        <main className="workspace">
          <div className="workspace-head">
            <div>
              <button className="back-link" onClick={() => setView("home")}>
                <ArrowLeft size={15} /> New research
              </button>
              <h1>{dish}</h1>
              <p>{context}</p>
              <div className="meta">
                <span>{visuals.length} visual references</span>
                <i /> <span>{sources.length} research sources</span>
                <i />{" "}
                <span>
                  {analysisData
                    ? `Analyzed with ${activeAnalysisModel}`
                    : analysisBusy
                      ? "Analyzing sources…"
                      : "Analysis unavailable"}
                </span>
              </div>
            </div>
            <div className="workspace-actions">
              <div
                className="brief-pill"
                onClick={() => setBriefOpen(!briefOpen)}
              >
                <Bookmark size={15} /> Brief · {savedCount} saved
              </div>
              <button
                className={
                  savedSession ? "secondary-button saved" : "secondary-button"
                }
                onClick={saveSession}
                disabled={savedSession}
              >
                {savedSession ? <Check size={15} /> : <Bookmark size={15} />}
                {savedSession ? "Research saved" : "Save research"}
              </button>
            </div>
          </div>

          <section className="section visual-section">
            <SectionHeader
              eyebrow="01 / Visual discovery"
              title="Visual references"
              description="Browse images found for this dish so you can see how it is presented and served."
            />
            {visuals.length ? (
              <div className="visual-grid">
                {visuals.map((v) => (
                  <article className="visual-card" key={v.id}>
                    <button
                      className="visual-image"
                      onClick={() => setSelectedVisual(v.id)}
                    >
                      <img src={v.imageUrl} alt={v.title} />
                      <span className="image-badge">Google Images</span>
                    </button>
                    <div className="visual-info">
                      <div>
                        <h3>{v.title}</h3>
                        <p>{v.source}</p>
                      </div>
                      <button
                        className={
                          savedVisuals.includes(v.id)
                            ? "save-button saved"
                            : "save-button"
                        }
                        onClick={() =>
                          toggle(savedVisuals, setSavedVisuals, v.id)
                        }
                      >
                        {savedVisuals.includes(v.id) ? (
                          <Check size={14} />
                        ) : (
                          <Plus size={14} />
                        )}
                        {savedVisuals.includes(v.id) ? "Saved" : "Save to brief"}
                      </button>
                    </div>
                    <button
                      className="source-link"
                      onClick={() => setSelectedVisual(v.id)}
                    >
                      <ExternalLink size={12} /> View source context
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="section-empty">
                No images were found for this search. Try adding a context to
                the query.
              </div>
            )}
          </section>

          <section className="section recipe-section">
            <SectionHeader
              eyebrow="02 / Source discovery"
              title="Research sources"
              description="Review the pages found for this search — structured recipes, articles, and social posts alike."
            />
            {sources.length ? (
              <div className="recipe-list">
                {sources.map((source, i) => (
                  <article
                    className="recipe-row"
                    key={source.url || source.title || i}
                  >
                    <div className="recipe-index">0{i + 1}</div>
                    <div className="recipe-main">
                      <div className="recipe-title">
                        <h3>{source.title || "Untitled source"}</h3>
                        <span>{contentTypeLabel(source.contentType)}</span>
                      </div>
                      <p>
                        {source.snippet ||
                          (source.content
                            ? `${source.content.slice(0, 180)}…`
                            : "No preview text was available for this source.")}
                      </p>
                      <small>{source.source || "Web source"}</small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="text-button"
                        onClick={() => setSelectedSource(i)}
                      >
                        View source <ArrowRight size={14} />
                      </button>
                      <button
                        className={
                          savedSources.includes(i)
                            ? "save-button saved"
                            : "save-button"
                        }
                        onClick={() =>
                          toggle(savedSources, setSavedSources, i)
                        }
                      >
                        {savedSources.includes(i) ? (
                          <Check size={14} />
                        ) : (
                          <Plus size={14} />
                        )}
                        {savedSources.includes(i) ? "Saved" : "Save"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="section-empty">
                No web sources were found for this search.
              </div>
            )}
          </section>

          <section className="section comparison-section">
            <SectionHeader
              eyebrow="03 / Source comparison"
              title="Compare sources"
              description="See what the sources have in common and where they differ."
            />
            {analysisBusy ? (
              <div className="section-empty">
                <span className="spinner dark" /> Analyzing sources…
              </div>
            ) : (
              <>
                <div className="comparison-grid">
                  <div className="comparison-card">
                    <div className="card-label">
                      <span>Common ingredients</span>
                      <span>Source agreement</span>
                    </div>
                    {analysisData?.commonIngredients.length ? (
                      analysisData.commonIngredients.map((item) => (
                        <div className="ingredient" key={item.ingredient}>
                          <span>{item.ingredient}</span>
                          <div>
                            <span className="bar">
                              <i
                                style={{
                                  width: `${Math.max(
                                    8,
                                    Math.round(
                                      (item.sourceCount / maxIngredientCount) *
                                        100,
                                    ),
                                  )}%`,
                                }}
                              />
                            </span>
                            <strong>
                              {item.sourceCount}{" "}
                              {item.sourceCount === 1 ? "source" : "sources"}
                            </strong>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-saved">
                        No consistent ingredient pattern was found across the
                        sources.
                      </p>
                    )}
                  </div>
                  <div className="comparison-card differences">
                    <div className="card-label">
                      <span>Where sources differ</span>
                      <span>Meaningful variations</span>
                    </div>
                    {analysisData?.differences.length ? (
                      analysisData.differences.map((item) => {
                        const findingText = `${item.topic}: ${item.details}${withSourceTitles(item.sourceTitles)}`;
                        return (
                          <div
                            className="difference"
                            key={findingText}
                          >
                            <span className="difference-dot" />
                            <p>
                              {item.topic}: {item.details}
                              {item.sourceTitles.length > 0 && (
                                <small>
                                  Sources: {item.sourceTitles.join(", ")}
                                </small>
                              )}
                            </p>
                            <button
                              className={
                                savedFindings.includes(findingText)
                                  ? "tiny-save saved"
                                  : "tiny-save"
                              }
                              onClick={() => toggleFinding(findingText)}
                            >
                              {savedFindings.includes(findingText) ? (
                                <Check size={13} />
                              ) : (
                                <Plus size={13} />
                              )}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="empty-saved">
                        No meaningful differences surfaced across the sources.
                      </p>
                    )}
                  </div>
                </div>
                <div className="agreement-card">
                  <div>
                    <span className="eyebrow">What sources agree on</span>
                    <h3>Shared patterns across the research</h3>
                  </div>
                  <div className="agreement-list">
                    {analysisData?.observations.length ? (
                      analysisData.observations.map((item, i) => {
                        const findingText = `${item.observation}${withSourceTitles(item.sourceTitles)}`;
                        return (
                          <button
                            key={`${item.observation}-${i}`}
                            onClick={() => toggleFinding(findingText)}
                          >
                            <span>
                              <strong>
                                {item.sourceTitles.length || 1}{" "}
                                {item.sourceTitles.length === 1
                                  ? "source"
                                  : "sources"}
                              </strong>
                              {item.observation}
                            </span>
                            {savedFindings.includes(findingText) ? (
                              <Check size={15} />
                            ) : (
                              <Plus size={15} />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <span className="empty-saved">
                        No consistent pattern found across the sources.
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="section analysis-section">
            <SectionHeader
              eyebrow="04 / Interpretation"
              title="Research analysis"
              description="A helpful reading of the sources — not a replacement for inspecting them."
            />
            <div className="analysis-layout">
              <div className="analysis-highlight">
                <div className="sparkle-circle">
                  <Sparkles size={18} />
                </div>
                <span className="eyebrow">
                  Analyzed with {activeAnalysisModel}
                </span>
                {analysisBusy ? (
                  <>
                    <h3>Analyzing sources…</h3>
                    <p>
                      The selected model is reading the research sources. This
                      can take a moment.
                    </p>
                  </>
                ) : analysisData?.summary ? (
                  <>
                    <h3>{summarySplit.headline}</h3>
                    {summarySplit.rest && <p>{summarySplit.rest}</p>}
                  </>
                ) : (
                  <>
                    <h3>Analysis isn&apos;t available for this research.</h3>
                    <p>
                      {analysisError ||
                        "The sources above are still useful evidence — you can re-analyze them with the model below."}
                    </p>
                  </>
                )}
              </div>
              <div className="analysis-details">
                <div>
                  <span className="eyebrow">Techniques across sources</span>
                  {analysisData?.techniques.length ? (
                    <ul>
                      {analysisData.techniques.map((item, i) => (
                        <li key={`${item.technique}-${i}`}>
                          {item.technique}
                          {item.details ? ` — ${item.details}` : ""}
                          {item.sourceTitles.length > 0 && (
                            <small className="technique-sources">
                              {" "}
                              Sources: {item.sourceTitles.join(", ")}
                            </small>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-saved">
                      No techniques were described consistently across the
                      sources.
                    </p>
                  )}
                </div>
                <div>
                  <span className="eyebrow">What this research contains</span>
                  <ul>
                    <li>{sources.length} web sources reviewed</li>
                    <li>
                      {
                        sources.filter((s) => s.contentType === "recipe")
                          .length
                      }{" "}
                      with structured recipe data
                    </li>
                    <li>
                      {
                        sources.filter(
                          (s) =>
                            s.contentType === "article" ||
                            s.contentType === "social",
                        ).length
                      }{" "}
                      articles or social posts used as context
                    </li>
                    <li>{visuals.length} visual references found</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="reanalyze">
              <span>
                Research model <strong>{modelLabel(model)}</strong>
              </span>
              <button
                onClick={runReanalysis}
                disabled={reanalyzing || !sources.length}
              >
                {reanalyzing ? (
                  <>
                    <span className="spinner dark" /> Re-analyzing sources...
                  </>
                ) : (
                  <>
                    Re-analyze with {modelLabel(model)} <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="section notes-section">
            <SectionHeader
              eyebrow="05 / Your perspective"
              title="My notes"
              description="Keep the things you want to remember about this research."
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add anything you want to remember about this research..."
            />
            <div className="notes-footer">
              <NotebookPen size={15} /> Your notes are separate from the
              research analysis.
            </div>
          </section>

          <section className="brief-section">
            <div className="brief-heading">
              <div>
                <span className="eyebrow">The collection</span>
                <h2>Research brief</h2>
                <p>
                  Everything you&apos;ve chosen to keep from this research
                  session.
                </p>
              </div>
              <div className="brief-actions">
                <button onClick={copyBrief}>
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}
                  {copied ? "Research brief copied" : "Copy brief"}
                </button>
                <button onClick={downloadBrief}>
                  <Download size={15} /> Download
                </button>
                <button
                  className="danger-button"
                  onClick={() => setClearOpen(true)}
                >
                  Clear brief
                </button>
              </div>
            </div>
            <div className="brief-paper">
              <div className="brief-meta">
                <span>Research</span>
                <h3>{dish}</h3>
                <p>{context}</p>
                <small>Research model · {modelLabel(model)}</small>
              </div>
              <div className="brief-columns">
                <div>
                  <span className="eyebrow">Key findings</span>
                  <p>
                    {analysisData?.summary ||
                      "Save findings from the comparison above to collect them here."}
                  </p>
                </div>
                <div>
                  <span className="eyebrow">Saved sources</span>
                  <p>
                    {savedSources.length
                      ? `${savedSources.length} source${savedSources.length > 1 ? "s" : ""} saved for closer review, with links back to the originals.`
                      : "Save a source to see it collected here."}
                  </p>
                </div>
              </div>
              <div className="saved-content">
                <div>
                  <span className="eyebrow">
                    Saved visual references · {savedVisuals.length}
                  </span>
                  <div className="saved-thumbs">
                    {savedVisuals.map((i) => (
                      <img
                        key={i}
                        src={visuals[i]?.imageUrl}
                        alt={visuals[i]?.title || ""}
                      />
                    ))}
                    {!savedVisuals.length && (
                      <span className="empty-saved">
                        Your saved images will appear here.
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="eyebrow">
                    Saved findings · {savedFindings.length}
                  </span>
                  {savedFindings.length ? (
                    savedFindings.map((x) => (
                      <p className="saved-finding" key={x}>
                        <Check size={13} /> {x}
                      </p>
                    ))
                  ) : (
                    <span className="empty-saved">
                      Save a finding above to keep it close.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {briefOpen && view === "research" && researchData && (
        <aside className="brief-drawer">
          <button onClick={() => setBriefOpen(false)} aria-label="Close brief">
            <X size={18} />
          </button>
          <span className="eyebrow">Your collection</span>
          <h2>Brief · {savedCount} saved</h2>
          <p>
            Items you choose to keep will appear in your research brief below.
          </p>
          <div className="drawer-list">
            {savedVisuals.map((i) => (
              <div key={i}>
                <img src={visuals[i]?.imageUrl} alt="" />
                <span>
                  {visuals[i]?.title}
                  <small>Visual reference</small>
                </span>
              </div>
            ))}
            {savedSources.map((i) => (
              <div key={i}>
                <span className="drawer-icon">
                  <Search size={16} />
                </span>
                <span>
                  {sources[i]?.title || "Untitled source"}
                  <small>Research source</small>
                </span>
              </div>
            ))}
            {savedFindings.map((x) => (
              <div key={x}>
                <span className="drawer-icon">
                  <Star size={15} />
                </span>
                <span>
                  {x}
                  <small>Finding</small>
                </span>
              </div>
            ))}
            {!savedCount && (
              <div className="drawer-empty">
                <Bookmark size={22} />
                <p>Your brief is waiting for its first find.</p>
              </div>
            )}
          </div>
        </aside>
      )}

      {selectedVisual !== null && visuals[selectedVisual] && (
        <Modal onClose={() => setSelectedVisual(null)}>
          <img
            className="modal-visual"
            src={visuals[selectedVisual].originalUrl || visuals[selectedVisual].imageUrl}
            alt={visuals[selectedVisual].title}
          />
          <div className="modal-content">
            <span className="eyebrow">Google Images · Visual reference</span>
            <h2>{visuals[selectedVisual].title}</h2>
            <p className="modal-source">{visuals[selectedVisual].source}</p>
            <div className="modal-rule" />
            <span className="eyebrow">Where this image came from</span>
            <p>
              Found via Google Images from {visuals[selectedVisual].source}.
            </p>
            <div className="modal-actions">
              {visuals[selectedVisual].sourceUrl && (
                <a
                  className="secondary-button"
                  href={visuals[selectedVisual].sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={15} /> View original source
                </a>
              )}
              <button
                className="primary-button"
                onClick={() =>
                  toggle(savedVisuals, setSavedVisuals, selectedVisual)
                }
              >
                {savedVisuals.includes(selectedVisual) ? (
                  <Check size={15} />
                ) : (
                  <Plus size={15} />
                )}
                {savedVisuals.includes(selectedVisual)
                  ? "Saved to brief"
                  : "Save to brief"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedSource !== null && sources[selectedSource] && (
        <Modal onClose={() => setSelectedSource(null)}>
          <div className="recipe-detail">
            <span className="eyebrow">
              {contentTypeLabel(sources[selectedSource].contentType)}
            </span>
            <h2>{sources[selectedSource].title || "Untitled source"}</h2>
            <p className="modal-source">
              {sources[selectedSource].source || "Web source"}
            </p>
            {(sources[selectedSource].cookTime ||
              sources[selectedSource].yield) && (
              <>
                <div className="modal-rule" />
                <span className="eyebrow">Details from the source</span>
                <p>
                  {[
                    sources[selectedSource].cookTime,
                    sources[selectedSource].yield,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </>
            )}
            {sources[selectedSource].ingredients?.length ? (
              <>
                <div className="modal-rule" />
                <span className="eyebrow">Ingredients</span>
                <div className="ingredient-pills">
                  {sources[selectedSource].ingredients.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
              </>
            ) : null}
            {sources[selectedSource].instructions?.length ? (
              <>
                <span className="eyebrow">Preparation</span>
                {sources[selectedSource].instructions.map((step, i) => (
                  <p key={i}>
                    {i + 1}. {step}
                  </p>
                ))}
              </>
            ) : null}
            <div className="modal-rule" />
            <span className="eyebrow">
              {sources[selectedSource].content
                ? "From the page"
                : sources[selectedSource].snippet
                  ? "Search snippet"
                  : "About this source"}
            </span>
            <p>
              {sources[selectedSource].content
                ? `${sources[selectedSource].content.slice(0, 700)}${sources[selectedSource].content.length > 700 ? "…" : ""}`
                : sources[selectedSource].snippet
                  ? sources[selectedSource].snippet
                  : "Only the search result was available for this source — the page could not be read."}
            </p>
            <div className="modal-actions">
              {sources[selectedSource].url && (
                <a
                  className="secondary-button"
                  href={sources[selectedSource].url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={15} /> View original source
                </a>
              )}
              <button
                className="primary-button"
                onClick={() =>
                  toggle(savedSources, setSavedSources, selectedSource)
                }
              >
                {savedSources.includes(selectedSource) ? (
                  <Check size={15} />
                ) : (
                  <Plus size={15} />
                )}
                {savedSources.includes(selectedSource)
                  ? "Saved to brief"
                  : "Save to brief"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {clearOpen && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <span className="sparkle-circle">
              <Bookmark size={18} />
            </span>
            <h2>Clear this brief?</h2>
            <p>Remove all saved items from this brief?</p>
            <div>
              <button
                className="secondary-button"
                onClick={() => setClearOpen(false)}
              >
                Cancel
              </button>
              <button className="primary-button" onClick={clearBrief}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- components ------------------------------- */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

function SavedResearch({
  sessions,
  onOpen,
}: {
  sessions: SavedSession[];
  onOpen: (session: SavedSession) => void;
}) {
  return (
    <main className="saved-page">
      <div className="saved-intro">
        <span className="kicker">
          <Bookmark size={14} /> Your workspace
        </span>
        <h1>Saved research</h1>
        <p>
          Keep your discoveries close for the next time inspiration strikes.
        </p>
      </div>
      {sessions.length ? (
        <div className="saved-grid">
          {sessions.map((session) => (
            <button
              className="saved-session"
              key={session.id}
              onClick={() => onOpen(session)}
            >
              {session.images?.[0]?.thumbnail ||
              session.images?.[0]?.original ? (
                <img
                  src={session.images[0].thumbnail || session.images[0].original}
                  alt=""
                />
              ) : (
                <div className="saved-session-thumb" />
              )}
              <div>
                <span className="eyebrow">Research session</span>
                <h2>{session.dish}</h2>
                <p>{session.context || "No context"}</p>
                <small>
                  {session.images?.length ?? 0} visuals ·{" "}
                  {session.sources?.length ?? 0} sources
                  {session.savedAt
                    ? ` · saved ${new Date(session.savedAt).toLocaleDateString()}`
                    : ""}
                </small>
              </div>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      ) : (
        <div className="saved-empty">
          No saved research yet. Run a search and use “Save research” in the
          workspace to keep a session here.
        </div>
      )}
    </main>
  );
}
