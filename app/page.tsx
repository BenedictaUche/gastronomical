"use client";

import { useMemo, useState } from "react";
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
  Filter,
  ImageIcon,
  Leaf,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  Star,
  X,
  UtensilsCrossed,
  WandSparkles,
} from "lucide-react";

const models = [
  { name: "Gemma 4", description: "Open-weight · Multimodal" },
  { name: "Mistral", description: "Open-weight language model" },
  { name: "Llama", description: "Open-weight language model" },
  { name: "Custom model", description: "Bring your own model" },
];
const visuals = [
  [
    "Mofongo with garlic and pork cracklings",
    "Puerto Rican Food Guide",
    "Traditional",
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85",
    "The source discusses Puerto Rican mofongo and shows this preparation.",
  ],
  [
    "A mortar of mashed plantains",
    "Sazón Journal",
    "Home-style",
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
    "A close look at the traditional pilón used to make mofongo.",
  ],
  [
    "Mofongo served with broth",
    "Taste Puerto Rico",
    "Traditional",
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
    "This visual pairs mofongo with a light broth, a common serving style.",
  ],
  [
    "Golden fried plantains",
    "Island Table",
    "Home-style",
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
    "The image shows the plantains before they are crushed and seasoned.",
  ],
  [
    "Restaurant-style mofongo bowl",
    "Mesa Moderna",
    "Restaurant",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85",
    "A contemporary plating reference from a restaurant-focused source.",
  ],
  [
    "Pilon and wooden masher",
    "Caribe Kitchen",
    "Traditional",
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=85",
    "The source highlights the tools used for a classic preparation.",
  ],
  [
    "Mofongo with avocado garnish",
    "The Local Plate",
    "Other",
    "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=900&q=85",
    "A modern interpretation that keeps the mashed plantain base.",
  ],
  [
    "Family-style Puerto Rican table",
    "Diaspora Digest",
    "Home-style",
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
    "A home-style context image from a story about family recipes.",
  ],
  [
    "Crisp plantain rounds",
    "Good Food Stories",
    "Other",
    "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=85",
    "The source uses this image to explain the frying step.",
  ],
  [
    "Mofongo in a stone mortar",
    "Puerto Rico Eats",
    "Traditional",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=85",
    "A visual reference showing how the finished dish is shaped in the pilón.",
  ],
  [
    "Garlic, olive oil and plantain",
    "Cooked by Marisol",
    "Home-style",
    "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=900&q=85",
    "A creator-led recipe source focused on the foundational ingredients.",
  ],
  [
    "Mofongo with shrimp",
    "Coastal Kitchen",
    "Restaurant",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=85",
    "A seafood variation presented by a coastal restaurant source.",
  ],
];
const recipes = [
  {
    title: "Traditional Puerto Rican Mofongo",
    source: "Puerto Rican Food Guide",
    type: "Traditional",
    desc: "A classic preparation built around fried green plantains, garlic, olive oil, and chicharrón.",
    ingredients: [
      "Green plantains",
      "Garlic cloves",
      "Pork cracklings",
      "Olive oil",
      "Salt",
      "Chicken broth",
    ],
    prep: "Fry the plantains until tender, then pound them warm with garlic, salt, and cracklings. Shape in a pilón and serve with broth.",
    url: "#",
  },
  {
    title: "Mofongo Recipe",
    source: "Sazón Journal",
    type: "Home-style",
    desc: "A family-style version with a generous garlic seasoning and optional crispy pork.",
    ingredients: [
      "Green plantains",
      "Garlic",
      "Olive oil",
      "Bacon or pork cracklings",
      "Chicken stock",
    ],
    prep: "Mash fried plantains in batches with garlic oil and pork, loosening the mixture with warm stock.",
    url: "#",
  },
  {
    title: "How to Make Mofongo",
    source: "Cooked by Marisol",
    type: "Food creator",
    desc: "A creator’s practical walkthrough with notes on texture, timing, and serving.",
    ingredients: ["Plantains", "Garlic", "Salt", "Cilantro", "Pork rinds"],
    prep: "Keep the plantains warm while pounding and add seasoning gradually until the mixture holds its shape.",
    url: "#",
  },
  {
    title: "Classic Mofongo",
    source: "Taste Puerto Rico",
    type: "Recipe publication",
    desc: "A concise traditional recipe that serves the mofongo with a savory garlic broth.",
    ingredients: [
      "Green plantains",
      "Garlic",
      "Pork cracklings",
      "Broth",
      "Cilantro",
    ],
    prep: "Fry, pound, and shape the plantain mixture. Pour broth around the base just before serving.",
    url: "#",
  },
  {
    title: "Mofongo with Shrimp",
    source: "Coastal Kitchen",
    type: "Modern interpretation",
    desc: "A seafood-forward variation that keeps the classic plantain and garlic foundation.",
    ingredients: ["Plantains", "Shrimp", "Garlic", "Butter", "Stock", "Lime"],
    prep: "Prepare the mofongo base, then top with garlic shrimp and a spoonful of pan sauce.",
    url: "#",
  },
  {
    title: "Mofongo de Yuca",
    source: "Mesa Moderna",
    type: "Modern interpretation",
    desc: "A contemporary root-vegetable variation inspired by the traditional technique.",
    ingredients: ["Cassava", "Garlic", "Olive oil", "Pork cracklings", "Salt"],
    prep: "Boil cassava until tender, then mash with the seasoned garlic oil and shape while warm.",
    url: "#",
  },
];
const agreements = [
  "Green plantains form the base of the dish.",
  "Garlic is central to the seasoning.",
  "The plantains are cooked before they are mashed.",
  "Mofongo is shaped and served as a mound or ball.",
  "A savory broth is commonly served alongside.",
  "Texture depends on pounding while the plantain is warm.",
];
const differences = [
  "Cooking method: Most sources fry the plantains before mashing, while some use boiling or baked alternatives.",
  "Protein: Some recipes include pork cracklings while others omit them or use seafood.",
  "Seasoning: Garlic appears frequently, but quantities and additional seasonings vary.",
  "Serving: Sources differ in how the finished mofongo is shaped and what is placed around it.",
];

export default function Page() {
  const [view, setView] = useState<"home" | "research" | "saved">("home");
  const [dish, setDish] = useState("Mofongo");
  const [context, setContext] = useState("Traditional Puerto Rican");
  const [kind, setKind] = useState("Recipe");
  const [extra, setExtra] = useState(
    "Focus on traditional presentation and recipes from food creators or local sources.",
  );
  const [showExtra, setShowExtra] = useState(false);
  const [model, setModel] = useState("Gemma 4");
  const [modelOpen, setModelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selectedVisual, setSelectedVisual] = useState<number | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null);
  const [savedVisuals, setSavedVisuals] = useState<number[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<number[]>([]);
  const [savedFindings, setSavedFindings] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [savedSession, setSavedSession] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);

  const [researchData, setResearchData] = useState<{
    images: any[]
    sources: any[]
    recipes: any[]
  } | null>(null)

  const [analysisData, setAnalysisData] = useState<any | null>(null)

  const liveVisuals = researchData?.images?.map((image, index) => ({
    id: image.position ?? index + 1,
    title: image.title || `${dish} image`,
    source: image.source || "Google Images",
    category: "Search result",
    imageUrl: image.thumbnail || image.original,
    sourceUrl: image.link || image.original,
  })) ?? []

  const liveRecipes = researchData?.sources?.map((source, index) => ({
    id: source.position ?? index + 1,
    title: source.title || "Untitled source",
    source: source.source || source.displayed_link || "Web source",
    type: "Web source",
    desc: source.snippet || "",
    url: source.link || "#",
  })) ?? []

  const filteredVisuals = liveVisuals.filter((visual) => {
    if (filter === "All") return true
    return visual.category === filter
  })

  const savedCount =
    savedVisuals.length +
    savedRecipes.length +
    savedFindings.length +
    (notes.trim() ? 1 : 0);
  const startResearch = async () => {
    if (!dish.trim()) return

    setLoading(true)

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dish,
          context,
          kind,
          extra,
        }),
      })

      const data = await response.json()

      console.log("Research result:", data)

      if (!response.ok) {
        throw new Error(data.error || "Research failed")
      }

      setResearchData(data)

      if (data.recipes?.length) {
        const analysisResponse = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dish,
            context,
            recipes: data.recipes.map((item: any) => item.recipe),
          }),
        })

        const analysisData = await analysisResponse.json()

        if (!analysisResponse.ok) {
          throw new Error(
            analysisData.error || "Recipe analysis failed"
          )
        }

        setAnalysisData(analysisData.analysis)
      }

      setLoading(false)
      setView("research")
    } catch (error) {
      console.error("Research failed:", error)
      setLoading(false)
    }
  }
  const toggle = (
    list: number[],
    setList: (v: number[]) => void,
    index: number,
  ) =>
    setList(
      list.includes(index) ? list.filter((x) => x !== index) : [...list, index],
    );
  const runReanalysis = () => {
    setReanalyzing(true);
    setTimeout(() => setReanalyzing(false), 1100);
  };
  const briefText = `FOOD RESEARCH\n\n${dish}\n${context}\nResearch model: ${model}\n\nKEY FINDINGS\n${agreements.join("\n")}\n\nRECIPE FINDINGS\nGreen plantains appear in ${recipes.length}/${recipes.length} sources. Garlic appears in 5/${recipes.length} sources. Sources differ on protein, cooking method, and serving style.\n\nMY NOTES\n${notes || "No notes added."}\n\nSAVED VISUAL REFERENCES\n${savedVisuals.map((i) => visuals[i][0]).join("\n") || "None"}\n\nSAVED RECIPE SOURCES\n${savedRecipes.map((i) => recipes[i].title).join("\n") || "None"}\n\nSAVED FINDINGS\n${savedFindings.join("\n") || "None"}`;
  const copyBrief = async () => {
    await navigator.clipboard?.writeText(briefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const downloadBrief = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([briefText], { type: "text/plain" }));
    a.download = `${dish.toLowerCase().replaceAll(" ", "-")}-research-brief.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const clearBrief = () => {
    setSavedVisuals([]);
    setSavedRecipes([]);
    setSavedFindings([]);
    setNotes("");
    setClearOpen(false);
  };

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
              {model}
              <ChevronDown size={14} />
            </button>
            {modelOpen && (
              <div className="model-menu">
                <p className="eyebrow">Research model</p>
                {models.map((m) => (
                  <button
                    key={m.name}
                    className={
                      model === m.name
                        ? "model-option selected"
                        : "model-option"
                    }
                    onClick={() => {
                      setModel(m.name);
                      setModelOpen(false);
                    }}
                  >
                    <span>
                      <strong>{m.name}</strong>
                      <small>{m.description}</small>
                    </span>
                    {model === m.name && <Check size={15} />}
                  </button>
                ))}
                <p className="model-note">
                  Different models may produce different interpretations. Switch
                  models to compare.
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
                  placeholder="e.g. Mofongo, tres leches, jollof rice..."
                />
              </label>
              <label>
                <span>What context matters?</span>
                <input
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Traditional Puerto Rican..."
                />
              </label>
            </div>
            <fieldset>
              <legend>What are you researching for?</legend>
              <div className="choice-row">
                {[
                  "Recipe",
                  "Recipe roundup",
                  "Food discovery",
                  "Just researching",
                ].map((x) => (
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
            <div className="form-footer">
              <div className="model-summary">
                <span className="model-dot" />
                <span>
                  <small>Research model</small>
                  <strong>{model}</strong>
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
                    <span className="spinner" /> Researching
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
          <div className="recent">
            <div>
              <span className="eyebrow">Your workspace</span>
              <h3>Recent research</h3>
            </div>
            <div className="recent-items">
              {[
                ["Mofongo", "Traditional Puerto Rican"],
                ["Jollof Rice", "Nigerian home-style"],
                ["Tres Leches", "Traditional Mexican"],
              ].map(([x, y]) => (
                <button
                  key={x}
                  onClick={() => {
                    setDish(x);
                    setContext(y);
                    setView("research");
                  }}
                >
                  <span className="recent-thumb" />
                  <span>
                    <strong>{x}</strong>
                    <small>{y}</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </div>
        </main>
      )}
      {view === "saved" && (
        <SavedResearch
          onOpen={(d, c) => {
            setDish(d);
            setContext(c);
            setView("research");
          }}
        />
      )}
      {view === "research" && (
        <main className="workspace">
          <div className="workspace-head">
            <div>
              <button className="back-link" onClick={() => setView("home")}>
                <ArrowLeft size={15} /> New research
              </button>
              <h1>{dish}</h1>
              <p>{context}</p>
              <div className="meta">
                <span>18 visual references</span>
                <i /> <span>6 recipe sources</span>
                <i /> <span>Analyzed with {model}</span>
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
                onClick={() => setSavedSession(!savedSession)}
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
              description="Browse images that may help you understand or illustrate the dish in the requested context."
            />
            <div className="filter-bar">
              <div className="filters">
                <Filter size={14} />
                {[
                  "All",
                  "Traditional",
                  "Home-style",
                  "Restaurant",
                  "Other",
                ].map((x) => (
                  <button
                    className={filter === x ? "filter-active" : ""}
                    onClick={() => setFilter(x)}
                    key={x}
                  >
                    {x}
                  </button>
                ))}
              </div>
              <button className="sort-button">
                Most relevant <ChevronDown size={14} />
              </button>
            </div>
            <div className="visual-grid">
              {filteredVisuals.map((v) => {
                return (
                  <article className="visual-card" key={v.id}>
                    <button
                      className="visual-image"
                      onClick={() => setSelectedVisual(v.id)}
                    >
                      <img src={v.imageUrl} alt={v.title} />
                      <span className="image-badge">{v.category}</span>
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
                        {savedVisuals.includes(v.id)
                          ? "Saved"
                          : "Save to brief"}
                      </button>
                    </div>
                    <button
                      className="source-link"
                      onClick={() => setSelectedVisual(v.id)}
                    >
                      <ExternalLink size={12} /> View source context
                    </button>
                  </article>
                );
              })}
            </div>


          </section>
          <section className="section recipe-section">
            <SectionHeader
              eyebrow="02 / Source discovery"
              title="Recipe sources"
              description="Compare recipes from different sources before deciding what information to use."
            />
            <div className="recipe-list">
              {liveRecipes.map((r, i) => (
                <article className="recipe-row" key={r.title}>
                  <div className="recipe-index">0{i + 1}</div>
                  <div className="recipe-main">
                    <div className="recipe-title">
                      <h3>{r.title}</h3>
                      <span>{r.type}</span>
                    </div>
                    <p>{r.desc}</p>
                    <small>{r.source}</small>
                  </div>
                  <div className="row-actions">
                    <button
                      className="text-button"
                      onClick={() => setSelectedRecipe(i)}
                    >
                      View source <ArrowRight size={14} />
                    </button>
                    <button
                      className={
                        savedRecipes.includes(i)
                          ? "save-button saved"
                          : "save-button"
                      }
                      onClick={() => toggle(savedRecipes, setSavedRecipes, i)}
                    >
                      {savedRecipes.includes(i) ? (
                        <Check size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                      {savedRecipes.includes(i) ? "Saved" : "Save"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="section comparison-section">
            <SectionHeader
              eyebrow="03 / Recipe comparison"
              title="Compare recipes"
              description="See what the sources have in common and where they differ."
            />
            <div className="comparison-grid">
              <div className="comparison-card">
                <div className="card-label">
                  <span>Common ingredients</span>
                  <span>Source agreement</span>
                </div>
                {[
                  ["Green plantains", "6/6"],
                  ["Garlic", "5/6"],
                  ["Salt", "5/6"],
                  ["Pork cracklings", "4/6"],
                  ["Olive oil", "4/6"],
                ].map(([a, b]) => (
                  <div className="ingredient" key={a}>
                    <span>{a}</span>
                    <div>
                      <span className="bar">
                        <i style={{ width: `${(parseInt(b) / 6) * 100}%` }} />
                      </span>
                      <strong>{b}</strong>
                    </div>
                  </div>
                ))}
              </div>
              <div className="comparison-card differences">
                <div className="card-label">
                  <span>Where sources differ</span>
                  <span>Meaningful variations</span>
                </div>
                {differences.map((x) => (
                  <div className="difference" key={x}>
                    <span className="difference-dot" />
                    <p>{x}</p>
                    <button
                      className={
                        savedFindings.includes(x)
                          ? "tiny-save saved"
                          : "tiny-save"
                      }
                      onClick={() =>
                        setSavedFindings(
                          savedFindings.includes(x)
                            ? savedFindings.filter((f) => f !== x)
                            : [...savedFindings, x],
                        )
                      }
                    >
                      {savedFindings.includes(x) ? (
                        <Check size={13} />
                      ) : (
                        <Plus size={13} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="agreement-card">
              <div>
                <span className="eyebrow">What sources agree on</span>
                <h3>Shared patterns across the research</h3>
              </div>
              <div className="agreement-list">
                {agreements.map((x, i) => (
                  <button
                    key={x}
                    onClick={() =>
                      setSavedFindings(
                        savedFindings.includes(x)
                          ? savedFindings.filter((f) => f !== x)
                          : [...savedFindings, x],
                      )
                    }
                  >
                    <span>
                      <strong>{i + 4} sources</strong>
                      {x}
                    </span>
                    {savedFindings.includes(x) ? (
                      <Check size={15} />
                    ) : (
                      <Plus size={15} />
                    )}
                  </button>
                ))}
              </div>
            </div>
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
                <span className="eyebrow">Analyzed with {model}</span>
                <h3>
                  {model === "Mistral"
                    ? "The sources point to a flexible, family-shaped dish."
                    : model === "Llama"
                      ? "Mofongo is best understood through its method and setting."
                      : "Mofongo is a dish with a strong foundation and room for variation."}
                </h3>
                <p>
                  Across the sources, the most consistent thread is the warm,
                  garlicky plantain base. The differences tell a useful story
                  about region, family, and the person cooking it.
                </p>
              </div>
              <div className="analysis-details">
                <div>
                  <span className="eyebrow">Important considerations</span>
                  <ul>
                    <li>
                      Source context varies between traditional, home-style, and
                      contemporary presentations.
                    </li>
                    <li>
                      Not every source includes pork, so avoid treating it as
                      universal.
                    </li>
                    <li>
                      Look closely at the serving style when choosing visual
                      references.
                    </li>
                  </ul>
                </div>
                <div>
                  <span className="eyebrow">Questions worth checking</span>
                  <ul>
                    <li>Are there regional differences in preparation?</li>
                    <li>How does the pilón change the final texture?</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="reanalyze">
              <span>
                Research model <strong>{model}</strong>
              </span>
              <button onClick={runReanalysis} disabled={reanalyzing}>
                {reanalyzing ? (
                  <>
                    <span className="spinner dark" /> Re-analyzing sources...
                  </>
                ) : (
                  <>
                    Re-analyze with {model} <ArrowRight size={14} />
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
                <small>Research model · {model}</small>
              </div>
              <div className="brief-columns">
                <div>
                  <span className="eyebrow">Key findings</span>
                  <p>
                    Green plantains and garlic appear as the clearest common
                    thread. Sources vary meaningfully in protein, cooking
                    method, and serving style.
                  </p>
                </div>
                <div>
                  <span className="eyebrow">Recipe findings</span>
                  <p>
                    {savedRecipes.length
                      ? `${savedRecipes.length} recipe source${savedRecipes.length > 1 ? "s" : ""} saved for closer review.`
                      : "Save a recipe source to see it collected here."}
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
                      <img key={i} src={visuals[i][3]} alt={visuals[i][0]} />
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
      {briefOpen && view === "research" && (
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
                <img src={visuals[i][3]} alt="" />
                <span>
                  {visuals[i][0]}
                  <small>Visual reference</small>
                </span>
              </div>
            ))}
            {savedRecipes.map((i) => (
              <div key={i}>
                <span className="drawer-icon">
                  <NotebookPen size={16} />
                </span>
                <span>
                  {recipes[i].title}
                  <small>Recipe source</small>
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
      {selectedVisual !== null && (
        <Modal onClose={() => setSelectedVisual(null)}>
          <img
            className="modal-visual"
            src={visuals[selectedVisual]?.[3]}
            alt={visuals[selectedVisual]?.[0]}
          />

          <div className="modal-content">
            <span className="eyebrow">
              {visuals[selectedVisual][2]} · Source context
            </span>
            <h2>{visuals[selectedVisual][0]}</h2>
            <p className="modal-source">{visuals[selectedVisual][1]}</p>
            <div className="modal-rule" />
            <span className="eyebrow">Why this was surfaced</span>
            <p>{visuals[selectedVisual][4]}</p>
            <div className="modal-actions">
              <button className="secondary-button">
                <ExternalLink size={15} /> View original source
              </button>
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
      {selectedRecipe !== null && (
        <Modal onClose={() => setSelectedRecipe(null)}>
          <div className="recipe-detail">
            <span className="eyebrow">{recipes[selectedRecipe].type}</span>
            <h2>{recipes[selectedRecipe].title}</h2>
            <p className="modal-source">{recipes[selectedRecipe].source}</p>
            <div className="modal-rule" />
            <span className="eyebrow">Ingredients</span>
            <div className="ingredient-pills">
              {recipes[selectedRecipe].ingredients.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <span className="eyebrow">Preparation</span>
            <p>{recipes[selectedRecipe].prep}</p>
            <span className="eyebrow">Source context</span>
            <p>{recipes[selectedRecipe].desc}</p>
            <div className="modal-actions">
              <button className="secondary-button">
                <ExternalLink size={15} /> View original source
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  toggle(savedRecipes, setSavedRecipes, selectedRecipe)
                }
              >
                {savedRecipes.includes(selectedRecipe)
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
  onOpen,
}: {
  onOpen: (dish: string, context: string) => void;
}) {
  const items = [
    [
      "Mofongo",
      "Traditional Puerto Rican",
      "18 visuals · 6 recipes",
      "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=500&q=80",
    ],
    [
      "Jollof Rice",
      "Nigerian home-style",
      "15 visuals · 5 recipes",
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80",
    ],
    [
      "Tres Leches",
      "Traditional Mexican",
      "14 visuals · 4 recipes",
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80",
    ],
  ];
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
      <div className="saved-grid">
        {items.map(([d, c, m, img]) => (
          <button
            className="saved-session"
            key={d}
            onClick={() => onOpen(d, c)}
          >
            <img src={img} alt="" />
            <div>
              <span className="eyebrow">Research session</span>
              <h2>{d}</h2>
              <p>{c}</p>
              <small>{m}</small>
            </div>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
    </main>
  );
}
