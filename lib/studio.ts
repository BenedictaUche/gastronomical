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
  /* Populated from JSON-LD when a page provides it. Optional because sessions
   * saved before these fields existed will not carry them. */
  prepTime?: string;
  author?: string;
  image?: string;
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

/**
 * Carousel design tokens.
 *
 * The slide is artwork, not UI: the photograph is the whole canvas and the
 * words are typeset over it. Everything below is a value React reads — the
 * model returns content only and never picks a gradient, a colour or a
 * position.
 */

export const SLIDE_CANVAS = {
  width: 1080,
  height: 1350,
  ratio: `${1080} / ${1350}`,
} as const;

/** One role per slide. Decides the composition, never the copy. */
export type SlideLayout =
  | "cover"
  | "ingredients"
  | "method"
  | "fact"
  | "closing";

export const SLIDE_LAYOUT_OPTIONS: { id: SlideLayout; label: string }[] = [
  { id: "cover", label: "Cover" },
  { id: "ingredients", label: "Ingredients" },
  { id: "method", label: "Method" },
  { id: "fact", label: "Fact" },
  { id: "closing", label: "Closing" },
];

/**
 * Three looks, one brand. Each is a different voice for the same full-bleed
 * photograph — none of them is a different layout system.
 */
export type SlideStyle = "editorial" | "creator" | "cinematic";

export const SLIDE_STYLES: { id: SlideStyle; label: string; note: string }[] = [
  {
    id: "editorial",
    label: "Editorial",
    note: "Serif display, quiet gradients, generous margins.",
  },
  {
    id: "creator",
    label: "Modern creator",
    note: "Sans display, strong bottom gradient, punchy hierarchy.",
  },
  {
    id: "cinematic",
    label: "Dark cinematic",
    note: "Deeper photographic contrast, elegant type, minimal copy.",
  },
];

/** Where the type sits on the canvas. This also chooses the gradient. */
export type TextAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center-center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const TEXT_ANCHORS: { id: TextAnchor; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-center", label: "Top centre" },
  { id: "top-right", label: "Top right" },
  { id: "center-left", label: "Centre left" },
  { id: "center-center", label: "Centre" },
  { id: "center-right", label: "Centre right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom centre" },
  { id: "bottom-right", label: "Bottom right" },
];

/**
 * The five overlays. Each keeps most of the photograph visible — none of them
 * is an opaque panel behind the words.
 */
export type OverlayVariant = "bottom" | "left" | "top" | "wash" | "warm";

export const OVERLAY_VARIANTS: { id: OverlayVariant; label: string }[] = [
  { id: "bottom", label: "Bottom gradient" },
  { id: "left", label: "Side gradient" },
  { id: "top", label: "Top gradient" },
  { id: "wash", label: "Even wash" },
  { id: "warm", label: "Warm wash" },
];

/**
 * Where the subject sits in the frame, used as `object-position` so the food is
 * never cropped out by the cover crop.
 */
export type ImageFocus =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export const IMAGE_FOCUSES: { id: ImageFocus; label: string }[] = [
  { id: "center", label: "Centre" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
];

export const FOCUS_TO_CSS: Record<ImageFocus, string> = {
  center: "50% 50%",
  top: "50% 0%",
  bottom: "50% 100%",
  left: "0% 50%",
  right: "100% 50%",
  "top-left": "0% 0%",
  "top-right": "100% 0%",
  "bottom-left": "0% 100%",
  "bottom-right": "100% 100%",
};

/**
 * Keep the words off the subject. A frame focused bottom-right almost always
 * has the food there, so the type moves to the opposite corner. This is a
 * compositional suggestion from the crop the creator chose — it is not
 * computer vision, and the creator always has the last word.
 */
const FOCUS_TO_OPPOSITE_ANCHOR: Record<ImageFocus, TextAnchor> = {
  center: "bottom-left",
  top: "bottom-left",
  bottom: "top-left",
  left: "bottom-right",
  right: "bottom-left",
  "top-left": "bottom-right",
  "top-right": "bottom-left",
  "bottom-left": "top-right",
  "bottom-right": "top-left",
};

export function suggestAnchor(focus: ImageFocus): TextAnchor {
  return FOCUS_TO_OPPOSITE_ANCHOR[focus] ?? "bottom-left";
}

/** The gradient that keeps type readable for a given text position. */
export function overlayForAnchor(anchor: TextAnchor): OverlayVariant {
  if (anchor === "top-left" || anchor === "top-center" || anchor === "top-right") return "top";
  if (anchor === "center-left" || anchor === "center-center" || anchor === "center-right") return "left";
  if (anchor === "bottom-right") return "left";
  return "bottom";
}

/** The cinematic look needs a deeper wash to hold light type on a photo. */
export function overlayForStyle(
  anchor: TextAnchor,
  style: SlideStyle
): OverlayVariant {
  const base = overlayForAnchor(anchor);
  if (style === "cinematic" && base !== "left") return "wash";
  return base;
}

/** One ingredient line. `amount` is never invented — only what the source said. */
export type SlideIngredient = {
  amount: string;
  ingredient: string;
};

/** One method step, numbered across the whole carousel rather than per slide. */
export type SlideStep = {
  label: string;
  text: string;
};

export type CarouselSlide = {
  id: string;
  /** Drives the composition. */
  type: SlideLayout;
  title: string;
  subtitle: string;
  /** Long-form copy for fact and closing slides. */
  body: string;
  ingredients: SlideIngredient[];
  steps: SlideStep[];
  /** Index into the studio's image pool; null until the creator assigns one. */
  imageIndex: number | null;
  focus: ImageFocus;
  anchor: TextAnchor;
  /** While true the anchor keeps following the focus; a manual choice clears it. */
  anchorAuto: boolean;
  overlay: OverlayVariant | "auto";
  style: SlideStyle;
  evidence: string[];
  /**
   * Read only, for sessions saved before the full-bleed redesign. Old layouts
   * are mapped onto the new roles by `migrateSlide`.
   */
  layout?: string;
};

export type SavedCarousel = {
  title: string;
  type: string;
  slides: CarouselSlide[];
  savedAt: string;
};

const LAYOUT_FROM_LEGACY: Record<string, SlideLayout> = {
  cover: "cover",
  statement: "fact",
  list: "ingredients",
  steps: "method",
  closing: "closing",
  ingredients: "ingredients",
  method: "method",
  fact: "fact",
};

/**
 * Units we are willing to move from the front of a line into the `amount` slot.
 * Anything not matched stays entirely in the ingredient text, so a line the
 * model wrote without a measurement never gains one.
 */
const AMOUNT_UNITS = new Set([
  "cup", "cups", "c", "tbsp", "tbsps", "tbsp.", "tablespoon", "tablespoons",
  "tsp", "tsps", "tsp.", "teaspoon", "teaspoons", "g", "kg", "mg", "ml", "l",
  "oz", "lb", "lbs", "piece", "pieces", "bunch", "bunches", "clove", "cloves",
  "slice", "slices", "can", "cans", "tin", "tins", "packet", "packets",
  "pack", "packs", "sprig", "sprigs", "stalk", "stalks", "handful", "handfuls",
  "dash", "dashes", "pinch", "pinches", "drop", "drops", "stick", "sticks",
  "head", "heads", "fillet", "fillets", "quart", "quarts", "pint", "pints",
  "cupful", "cupsful", "serving", "servings", "loaf", "loaves", "sheet",
  "sheets", "jar", "jars", "bottle", "bottles", "cube", "cubes",
]);

const QUANTITY_START =
  /^(?:\d|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])(?:[\d.,]*)(?:\s*(?:–|-|—|to)\s*\d+(?:\.[\d]+)?)?/i;

/**
 * Split one line the model produced into a measurement and the food it belongs
 * to. This only separates text that was already there — it never adds,
 * converts or guesses a quantity.
 */
export function splitAmount(line: string): SlideIngredient {
  const text = line.trim();
  const quantity = text.match(QUANTITY_START);

  if (!quantity || quantity.index === undefined) return { amount: "", ingredient: text };

  const rest = text.slice(quantity[0].length).trim();
  if (!rest) return { amount: text, ingredient: "" };

  const words = rest.split(/\s+/);
  let index = 0;
  while (index < 2 && index < words.length && AMOUNT_UNITS.has(words[index].toLowerCase())) {
    index += 1;
  }

  // No recognised unit: the number alone is still the measurement.
  return {
    amount: `${quantity[0]}${index > 0 ? ` ${words.slice(0, index).join(" ")}` : ""}`,
    ingredient: words.slice(index).join(" "),
  };
}

/** Read a slide's ingredient list from whichever shape arrived. */
export function readIngredients(slide: {
  ingredients?: SlideIngredient[];
  items?: { amount?: unknown; ingredient?: unknown; name?: unknown }[];
  body?: string;
}): SlideIngredient[] {
  const asPairs = (source: { amount?: unknown; ingredient?: unknown; name?: unknown }[]) =>
    source
      .map((entry) => ({
        amount: typeof entry.amount === "string" ? entry.amount.trim() : "",
        ingredient:
          typeof entry.ingredient === "string"
            ? entry.ingredient.trim()
            : typeof entry.name === "string"
              ? entry.name.trim()
              : "",
      }))
      .filter((entry) => entry.amount || entry.ingredient);

  if (Array.isArray(slide.ingredients) && slide.ingredients.length > 0) return asPairs(slide.ingredients);
  if (Array.isArray(slide.items) && slide.items.length > 0) return asPairs(slide.items);

  const lines = (slide.body || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map(splitAmount).filter((entry) => entry.ingredient);
}

/** Read method steps, keeping whatever numbering the source already used. */
export function readSteps(slide: { steps?: { label?: unknown; text?: unknown }[]; body?: string }, startAt = 1): SlideStep[] {
  const fromPairs =
    Array.isArray(slide.steps) && slide.steps.length > 0
      ? slide.steps
          .map((step, index) => ({
            text: (typeof step.text === "string" ? step.text : "").trim(),
            number: Number.parseInt(String(step.label ?? "").replace(/\D/g, ""), 10) || startAt + index,
          }))
          .filter((step) => step.text)
      : null;

  if (fromPairs) return fromPairs.map((step) => ({ label: pad(step.number), text: step.text }));

  const lines = (slide.body || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const leading = lines.map((line) => line.match(/^(\d+)[.)]/));
  const firstNumbered = leading.findIndex((match) => match !== null);
  const body = firstNumbered >= 0 ? lines.slice(firstNumbered) : lines;
  const offset = firstNumbered >= 0 ? Number(leading[firstNumbered]?.[1] ?? startAt) : startAt;

  return body
    .map((line, index) => ({
      label: pad(offset + index),
      text: line.replace(/^\d+[.)]\s*/, "").trim(),
    }))
    .filter((step) => step.text);
}

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Best-fit layout for a slide that did not say what it was. */
export function inferSlideType(
  slide: { type?: unknown; layout?: unknown; body?: string; ingredients?: unknown },
  index: number,
  total: number
): SlideLayout {
  const declared = typeof slide.type === "string" ? slide.type : "";
  if (declared && declared in LAYOUT_FROM_LEGACY) return LAYOUT_FROM_LEGACY[declared];

  const legacy = typeof slide.layout === "string" ? slide.layout : "";
  if (legacy && legacy in LAYOUT_FROM_LEGACY) return LAYOUT_FROM_LEGACY[legacy];

  if (index === 0) return "cover";
  if (total > 1 && index === total - 1) return "closing";

  const body = typeof slide.body === "string" ? slide.body : "";
  if (/^\s*\d+[.)]/m.test(body)) return "method";
  if (Array.isArray(slide.ingredients) || splitAmount(body.split("\n")[0] || "").amount) return "ingredients";
  if (body.includes("\n")) return "ingredients";
  return "fact";
}

/**
 * Bring any stored or freshly generated slide up to the current shape. Old
 * saved sessions carry `layout` and a flat `body`, so they are translated
 * rather than discarded.
 */
export function migrateSlide(
  raw: Partial<CarouselSlide> & Record<string, unknown>,
  index: number,
  total: number,
  defaults: { style: SlideStyle; focus: ImageFocus; imageIndex: number | null }
): CarouselSlide {
  const type = inferSlideType(raw, index, total);
  const focus = (typeof raw.focus === "string" ? raw.focus : defaults.focus) as ImageFocus;
  const style = (typeof raw.style === "string" ? raw.style : defaults.style) as SlideStyle;
  const anchor =
    typeof raw.anchor === "string" ? (raw.anchor as TextAnchor) : suggestAnchor(focus);
  const overlay =
    raw.overlay === "auto" || typeof raw.overlay === "string"
      ? (raw.overlay as OverlayVariant | "auto")
      : "auto";

  const ingredients = type === "ingredients" ? readIngredients(raw) : [];
  const steps = type === "method" ? readSteps(raw) : [];

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `slide-${index}-${Date.now().toString(36)}`,
    type,
    title: typeof raw.title === "string" ? raw.title : "",
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    body: typeof raw.body === "string" ? raw.body : "",
    ingredients,
    steps,
    imageIndex:
      typeof raw.imageIndex === "number" ? raw.imageIndex : defaults.imageIndex,
    focus,
    anchor,
    anchorAuto:
      typeof raw.anchorAuto === "boolean"
        ? raw.anchorAuto
        : typeof raw.anchor !== "string",
    overlay,
    style,
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.filter((entry): entry is string => typeof entry === "string")
      : [],
  };
}

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
  carousel: SavedCarousel | null;
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

/**
 * What the creator is making — the first-class choice on the start screen.
 */
export const CONTENT_TYPES: { id: string; label: string; description: string }[] = [
  { id: "Recipe", label: "Recipe", description: "Ingredients, method and the numbers cooks need." },
  { id: "Food discovery", label: "Food discovery", description: "What the dish is and why it is worth knowing." },
  { id: "Recipe roundup", label: "Recipe roundup", description: "A short list of takes worth trying." },
  { id: "Things to know", label: "Things to know", description: "Context and details worth sharing." },
  {
    id: "Ingredients & techniques",
    label: "Ingredients & techniques",
    description: "What goes in, and how the sources handle it.",
  },
];

export const DEFAULT_CONTENT_TYPE = CONTENT_TYPES[0].id;

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

/** The six carousel formats — deliberately a small, useful set. */
export const CAROUSEL_TYPES: CarouselDirection[] = [
  {
    id: "recipe",
    label: "Recipe",
    description: "Cover, what it is, ingredients, method, things to know, closing.",
  },
  {
    id: "discovery",
    label: "Food discovery",
    description: "What is this food? A short, grounded introduction.",
  },
  {
    id: "roundup",
    label: "Recipe roundup",
    description: "Several versions from the sources, lined up to compare.",
  },
  {
    id: "things",
    label: "Things to know",
    description: "The interesting facts and context the sources actually support.",
  },
  {
    id: "ingredients",
    label: "Ingredients & techniques",
    description: "What goes in and what the sources do with it.",
  },
  {
    id: "compare",
    label: "Compare",
    description: "Where versions of this dish differ, and why.",
  },
];

export const carouselTypeLabel = (id: string) =>
  CAROUSEL_TYPES.find((type) => type.id === id)?.label ?? id;

export const SESSIONS_KEY = "gastronomical-sessions";
export const MAX_SESSIONS = 12;

/* ------------------------------- persistence ------------------------------ */

export const emptyPack = (): ResearchPack => ({
  visuals: [],
  sources: [],
  findings: [],
  notes: [],
  imageNotes: {},
  carousel: null,
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

/**
 * Sessions saved before the full-bleed redesign are translated rather than
 * discarded: the legacy `layout` and flat `body` are carried through
 * `migrateSlide`, and design defaults are filled in.
 */
function normalizeCarousel(value: unknown): SavedCarousel | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const rawSlides = Array.isArray(record.slides) ? record.slides : [];
  const defaults = { style: "editorial" as const, focus: "center" as const, imageIndex: null };

  const slides = rawSlides
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;

      return migrateSlide(item as Partial<CarouselSlide>, index, rawSlides.length, defaults);
    })
    .filter((slide): slide is CarouselSlide => slide !== null);
  if (slides.length === 0) return null;

  return {
    title: typeof record.title === "string" ? record.title : "",
    type: typeof record.type === "string" ? record.type : "recipe",
    slides,
    savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date().toISOString(),
  };
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
    carousel: normalizeCarousel(legacyBrief.carousel),
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