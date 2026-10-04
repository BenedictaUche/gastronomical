/**
 * Shared studio types, constants and storage helpers.
 *
 * These types mirror exactly what `/api/research` and `/api/analyze` return.
 * Nothing here invents data — it only describes, labels and persists what the
 * real APIs produced plus what the creator explicitly chose to save.
 */

export type SourceType = "recipe" | "article" | "social" | "other";

export type ResearchImage = {
  position?: number;
  title?: string;
  source?: string;
  thumbnail?: string;
  original?: string;
  link?: string;
};

export type ResearchSource = {
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

export type AnalysisData = {
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

/**
 * Visual references are returned by Google Images with no category field, so
 * these labels are always the creator's own judgement — never a claim made
 * about the image by the product.
 */
export type ShotNote =
  | "finished"
  | "ingredients"
  | "preparation"
  | "presentation"
  | "other";

export const SHOT_NOTES: { id: ShotNote; label: string }[] = [
  { id: "finished", label: "Finished dish" },
  { id: "ingredients", label: "Ingredients" },
  { id: "preparation", label: "Preparation" },
  { id: "presentation", label: "Presentation" },
  { id: "other", label: "Other reference" },
];

export const shotNoteLabel = (id?: ShotNote) =>
  SHOT_NOTES.find((note) => note.id === id)?.label ?? "";

export type FindingSection = "ingredient" | "technique" | "difference" | "observation";

export type SavedFinding = {
  id: string;
  text: string;
  section: FindingSection;
  sources: string[];
};

export type CarouselSlide = {
  id: string;
  title: string;
  body: string;
  evidence: string[];
};

/**
 * The research pack holds only what the creator chose to keep. Finding
 * something is not the same as saving it.
 */
export type ResearchPack = {
  visuals: number[];
  sources: number[];
  findings: SavedFinding[];
  notes: string[];
  imageNotes: Record<number, ShotNote>;
};

export type SavedSession = {
  id: string;
  dish: string;
  context: string;
  kind: string;
  extra: string;
  model: string;
  savedAt: string;
  images: ResearchImage[];
  sources: ResearchSource[];
  analysis: AnalysisData | null;
  pack: ResearchPack;
};

/* -------------------------------- constants ------------------------------- */

// Only the Qwen model is wired up to the OpenRouter routes. The other options
// stay visible but are marked unavailable so the selector never offers
// something that is not implemented.
export type ModelOption = {
  id: string;
  name: string;
  description: string;
  available: boolean;
};

export const MODELS: ModelOption[] = [
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen 3.8 27B",
    description: "Open-weight · Active for synthesis",
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

export const DEFAULT_MODEL_ID = "qwen/qwen3.8-27b:free";

export const modelLabel = (id: string) =>
  MODELS.find((model) => model.id === id)?.name ?? (id || "No model");

export const RESEARCH_KINDS = [
  "Recipe",
  "Recipe roundup",
  "Food discovery",
  "Just researching",
] as const;

export const SOURCE_FILTERS: { id: SourceType | "all"; label: string }[] = [
  { id: "all", label: "All sources" },
  { id: "recipe", label: "Structured recipes" },
  { id: "article", label: "Articles" },
  { id: "social", label: "Social posts" },
  { id: "other", label: "Web results" },
];

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  recipe: "Structured recipe",
  article: "Article",
  social: "Social post",
  other: "Web result",
};

export type CarouselDirection = {
  id: string;
  label: string;
  description: string;
};

export const CAROUSEL_DIRECTIONS: CarouselDirection[] = [
  {
    id: "discovery",
    label: "Food discovery",
    description: "What the dish is, where it comes from, why it is worth filming.",
  },
  {
    id: "recipe",
    label: "Recipe-focused",
    description: "Ingredients and method, slide by slide from the recipes collected.",
  },
  {
    id: "learned",
    label: "Interesting things learned",
    description: "The details that surprised the sources — the hook for the post.",
  },
  {
    id: "ingredients",
    label: "Ingredients & techniques",
    description: "Break down what goes in and what the sources do with it.",
  },
  {
    id: "variations",
    label: "Comparing variations",
    description: "Where the sources disagree, and what that difference means.",
  },
];

export const SESSIONS_KEY = "gastronomical-sessions";
export const MAX_SESSIONS = 12;

/* ------------------------------- persistence ------------------------------ */

export const emptyPack = (): ResearchPack => ({
  visuals: [],
  sources: [],
  findings: [],
  notes: [],
  imageNotes: {},
});

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asIndexArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number")
    : [];
}

const SHOT_NOTE_IDS = new Set<string>(SHOT_NOTES.map((note) => note.id));

function normalizeImageNotes(value: unknown): Record<number, ShotNote> {
  if (!value || typeof value !== "object") return {};

  const result: Record<number, ShotNote> = {};

  for (const [key, note] of Object.entries(value)) {
    const index = Number(key);
    if (Number.isInteger(index) && typeof note === "string" && SHOT_NOTE_IDS.has(note)) {
      result[index] = note as ShotNote;
    }
  }

  return result;
}

function normalizeFindings(value: unknown): SavedFinding[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index): SavedFinding | null => {
      // Sessions saved before the redesign stored plain strings.
      if (typeof item === "string") {
        return item.trim()
          ? { id: `legacy-${index}`, text: item, section: "observation", sources: [] }
          : null;
      }

      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const text = typeof record.text === "string" ? record.text.trim() : "";
      if (!text) return null;

      const section = record.section;
      const validSection =
        section === "ingredient" ||
        section === "technique" ||
        section === "difference" ||
        section === "observation"
          ? section
          : "observation";

      return {
        id: typeof record.id === "string" ? record.id : `legacy-${index}`,
        text,
        section: validSection,
        sources: asStringArray(record.sources),
      };
    })
    .filter((item): item is SavedFinding => item !== null);
}

function normalizeNotes(value: unknown): string[] {
  // Pre-redesign sessions stored notes as one free-text blob.
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return asStringArray(value).map((note) => note.trim()).filter(Boolean);
}

export const normalizePack = (value: unknown): ResearchPack => {
  if (!value || typeof value !== "object") return emptyPack();

  // Sessions saved before the redesign named the pack "brief".
  const record = value as Record<string, unknown>;
  const legacyBrief = (
    record.brief && typeof record.brief === "object" ? record.brief : record
  ) as Record<string, unknown>;

  return {
    visuals: asIndexArray(legacyBrief.visuals),
    sources: asIndexArray(legacyBrief.sources),
    findings: normalizeFindings(legacyBrief.findings),
    notes: normalizeNotes(legacyBrief.notes),
    imageNotes: normalizeImageNotes(legacyBrief.imageNotes),
  };
};

export function loadSessions(): SavedSession[] {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is SavedSession =>
          !!item && typeof item.dish === "string" && Array.isArray(item.sources),
      )
      .map((session) => {
        const legacy = session as SavedSession & { brief?: unknown };
        return { ...session, pack: normalizePack(session.pack ?? legacy.brief) };
      });
  } catch {
    return [];
  }
}

export function persistSessions(sessions: SavedSession[]): boolean {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return true;
  } catch {
    // Storage can be unavailable (private mode / quota); keep the UI working.
    return false;
  }
}

/* --------------------------------- helpers -------------------------------- */

export const sourceType = (source: ResearchSource): SourceType =>
  source.contentType === "recipe" ||
  source.contentType === "article" ||
  source.contentType === "social"
    ? source.contentType
    : "other";

export const hostOf = (url?: string) => {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const packSize = (pack: ResearchPack) =>
  pack.visuals.length +
  pack.sources.length +
  pack.findings.length +
  pack.notes.length;

export const isImageSaved = (pack: ResearchPack, index: number) =>
  pack.visuals.includes(index);

export const isSourceSaved = (pack: ResearchPack, index: number) =>
  pack.sources.includes(index);

export const isFindingSaved = (pack: ResearchPack, id: string) =>
  pack.findings.some((finding) => finding.id === id);

let findingSeed = 0;

/** Stable-enough id for a finding, derived from its section and text. */
export const findingId = (section: FindingSection, text: string) => {
  findingSeed += 1;
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48);
  return `${section}-${slug}-${findingSeed.toString(36)}`;
};

export const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "carousel";