import { NextRequest, NextResponse } from "next/server";

import {
  OPENROUTER_MAX_TOKENS,
  openRouterChat,
  openRouterDiagnostics,
  openRouterErrorMessage,
} from "@/lib/openrouter";
import { DEFAULT_MODEL_ID, MODELS, readIngredients, readSteps } from "@/lib/studio";

/**
 * Carousel generation.
 *
 * Separate from /api/research and /api/analyze on purpose: research collects
 * evidence, analysis reads it, and this route turns the retrieved recipes and
 * sources into ready-to-post slide copy. It reuses the same OpenRouter
 * configuration and the same grounding rules.
 *
 * The model writes REAL slide copy — the words a creator would post — not a
 * structural outline she still has to write herself.
 */

// Same single source of truth as /api/analyze — see @/lib/studio.
const DEFAULT_MODEL = DEFAULT_MODEL_ID;
const ALLOWED_MODELS = new Set(
  MODELS.filter((model) => model.available && model.id.includes("/")).map((model) => model.id)
);

const MAX_FINDINGS = 25;
const MAX_SOURCES = 12;
const MAX_NOTES = 15;
const MAX_RECIPES = 6;
const MAX_SNIPPET_CHARS = 400;

const ALLOWED_TYPES = new Set([
  "recipe",
  "discovery",
  "roundup",
  "things",
  "ingredients",
  "compare",
]);

/**
 * Content only. No style, anchor, focus or overlay is ever decided here — the
 * design belongs to React, and the planner lets the creator change it.
 */
type GeneratedSlide = {
  type: string;
  title: string;
  subtitle: string;
  body: string;
  ingredients: { amount: string; ingredient: string }[];
  steps: { label: string; text: string }[];
  evidence: string[];
};

type GeneratedCarousel = {
  title: string;
  slides: GeneratedSlide[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

// Defensive normalization: a malformed slide must never crash the planner.
function normalizeCarousel(raw: unknown): GeneratedCarousel {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const slides = Array.isArray(raw) ? raw : Array.isArray(record.slides) ? record.slides : [];

  return {
    title: asString(record.title),
    slides: slides
      .map((item): GeneratedSlide | null => {
        const slide = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const title = asString(slide.title) || asString(slide.heading);
        const subtitle = asString(slide.subtitle);
        const body = asString(slide.body) || asString(slide.description) || asString(slide.text);
        if (!title && !body) return null;

        return {
          type: asString(slide.type) || asString(slide.layout) || "fact",
          title,
          subtitle,
          body,
          ingredients: readIngredients(slide),
          steps: readSteps(slide),
          evidence: asStringArray(slide.evidence).map((entry) => entry.trim()).filter(Boolean),
        };
      })
      .filter((slide): slide is GeneratedSlide => slide !== null),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { dish, context, type, recipes, findings, notes, sources, model: requested, regenerateIndex } = body;

    if (!asString(dish)) {
      return NextResponse.json({ error: "A dish is required." }, { status: 400 });
    }

    const promptRecipes = Array.isArray(recipes) ? recipes.slice(0, MAX_RECIPES) : [];
    const promptFindings = Array.isArray(findings) ? findings.slice(0, MAX_FINDINGS) : [];
    const promptSources = Array.isArray(sources) ? sources.slice(0, MAX_SOURCES) : [];
    const promptNotes = asStringArray(notes)
      .slice(0, MAX_NOTES)
      .map((note) => note.trim())
      .filter(Boolean);

    if (promptRecipes.length === 0 && promptFindings.length === 0 && promptSources.length === 0) {
      return NextResponse.json(
        {
          error:
            "There is not enough material yet. Search a dish first so the carousel can be built from real sources.",
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const requestedModel = typeof requested === "string" ? requested : "";
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

    const typeKey = typeof type === "string" && ALLOWED_TYPES.has(type) ? type : "discovery";

    const regenerating =
      typeof regenerateIndex === "number" && Number.isInteger(regenerateIndex) && regenerateIndex >= 0;

    const prompt = `
You are writing a finished Instagram-style carousel for a food creator. She will proofread it and post it, so every slide must already read like posted copy — not like a note to herself.

Topic: ${asString(dish)}
Context: ${asString(context) || "Not specified"}
Carousel type: ${typeKey}

Below is ONLY the material retrieved from real web sources for this topic (structured recipes plus analysis findings). Some of it may be the creator's own notes.

STRUCTURED RECIPES (fields are exactly what the source page provided — empty means the source did not say):
${JSON.stringify(
  promptRecipes.map((recipe) =>
    typeof recipe === "object" && recipe
      ? {
          title: asString((recipe as Record<string, unknown>).title),
          source: asString((recipe as Record<string, unknown>).source),
          author: asString((recipe as Record<string, unknown>).author),
          yield: asString((recipe as Record<string, unknown>).yield),
          prepTime: asString((recipe as Record<string, unknown>).prepTime),
          cookTime: asString((recipe as Record<string, unknown>).cookTime),
          ingredients: asStringArray((recipe as Record<string, unknown>).ingredients).slice(0, 30),
          instructions: asStringArray((recipe as Record<string, unknown>).instructions).slice(0, 20),
        }
      : { title: asString(recipe), source: "", author: "", yield: "", prepTime: "", cookTime: "", ingredients: [], instructions: [] },
  ),
  null,
  2,
)}

ANALYSIS FINDINGS (AI-synthesised, each attributed to source titles):
${JSON.stringify(
  promptFindings.map((finding) =>
    typeof finding === "object" && finding
      ? {
          text: asString((finding as Record<string, unknown>).text),
          sources: asStringArray((finding as Record<string, unknown>).sources),
        }
      : { text: asString(finding), sources: [] },
  ),
  null,
  2,
)}

SOURCES (title, publisher, and the text that was retrieved):
${JSON.stringify(
  promptSources.map((source) =>
    typeof source === "object" && source
      ? {
          title: asString((source as Record<string, unknown>).title),
          publisher: asString((source as Record<string, unknown>).source),
          text: asString((source as Record<string, unknown>).text).slice(0, MAX_SNIPPET_CHARS),
        }
      : { title: asString(source), publisher: "", text: "" },
  ),
  null,
  2,
)}

CREATOR'S OWN NOTES (ideas, never facts):
${JSON.stringify(promptNotes, null, 2)}

GROUNDING RULES (non-negotiable):
- Use ONLY the supplied material. Never use outside knowledge.
- NEVER invent ingredient measurements, serving sizes/yields, cooking times, or instructions. Copy them verbatim from the structured recipes when used.
- If a needed number is not in the supplied material, either leave it out or write "Not specified by source." Never fill a plausible value.
- Never expand a snippet into a full recipe. Never turn one source's method into "the" method.
- Never claim a dish is traditional, authentic, or regional unless a supplied source says so — and never claim an image or fact is authentic on your own judgement.
- Every factual slide must list the source title(s) it came from in "evidence". Purely structural slides (cover hook, closing question) use an empty "evidence" array.
- Distinguish "several recipes" from "one recipe": only say "most recipes" if multiple supplied sources agree.
- No hashtags. No engagement-bait emoji runs. Warm, confident, editorial tone.

SLIDE RULES:
- Write 5 to 7 slides unless the type is "roundup", where one slide per recipe is allowed (max 7).
- Every slide is a full-bleed photograph with words typeset over it. You write the WORDS ONLY. React owns the layout, the type, the colours, the gradients and every position.
- NEVER return CSS, HTML, colour values, gradient definitions, font sizes, or layout instructions. Those are not yours to decide.
- Choose a "type" for each slide:
    "cover"       — the dish name plus one short supporting line.
    "ingredients" — a measurement-led ingredient list. Use "ingredients", not "items".
    "method"      — short numbered steps. Use "steps".
    "fact"        — one short editorial observation or piece of context.
    "closing"     — a closing question, optionally with one short call to action.
- Measurements carry the hierarchy: put the quantity in "amount" (for example "4 cups") and the food in "ingredient" (for example "grated cocoyam"). Never merge them into one string.
- Keep every measurement exactly as the source stated it. If a source gave no amount, set "amount" to "" and keep the food in "ingredient" — never invent one.
- Steps must be SHORT — one line each, ideally under 12 words. If a method has more than 5 steps, split it across more than one "method" slide and continue the numbering; never cram a whole recipe onto one slide.
- "subtitle" is optional supporting copy: on a cover it is the one-line hook, on the closing it is the call to action. Leave it as "" when there is nothing to add.
- Slide titles read on a phone: roughly 5 words or fewer.
${
  regenerating
    ? `- You are regenerating ONE slide at position ${regenerateIndex + 1}. Return exactly one slide in "slides" with the same structure. Keep it grounded in the same material.`
    : `- Produce the full carousel in "slides", in posting order.`
}

Return JSON with exactly this structure. Only the keys shown, and only these keys per slide:

{
  "title": "short working title",
  "slides": [
    {
      "type": "cover | ingredients | method | fact | closing",
      "title": "slide headline",
      "subtitle": "short supporting line, or empty string",
      "body": "the finished copy for this slide",
      "ingredients": [
        { "amount": "4 cups", "ingredient": "grated cocoyam" }
      ],
      "steps": [
        { "label": "01", "text": "Grate the cocoyam." }
      ],
      "evidence": ["source title"]
    }
  ]
}
`;

    const result = await openRouterChat({
      apiKey,
      payload: {
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        // Same reasoning-model caveat as /api/analyze: reasoning must be off
        // or the model spends minutes thinking before returning JSON.
        reasoning: { enabled: false },
        max_tokens: OPENROUTER_MAX_TOKENS,
      },
    });

    if (!result.ok) {
      const message = openRouterErrorMessage(result);

      console.error(
        `[carousel] model=${model} failed after ${result.elapsedMs ?? 0}ms: ${message}`
      );

      return NextResponse.json(
        {
          error: message,
          model,
          openrouter: openRouterDiagnostics(result),
        },
        { status: 502 },
      );
    }

    const data = result.data;

    const content = data?.choices?.[0]?.message?.content;
    const finishReason = data?.choices?.[0]?.finish_reason;

    if (!content) {
      return NextResponse.json(
        { error: "The model returned an empty response." },
        { status: 502 },
      );
    }

    let parsed: unknown;

    try {
      // Some models wrap JSON in code fences even with response_format.
      const cleaned = String(content)
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();

      parsed = JSON.parse(cleaned);
    } catch {
      const truncated = finishReason === "length";

      console.error(
        `[carousel] unparseable reply from model=${model} finishReason=${finishReason ?? "unknown"} length=${String(
          content
        ).length}`
      );

      return NextResponse.json(
        {
          error: truncated
            ? "The model ran out of output space before finishing. Try again, or raise OPENROUTER_MAX_TOKENS."
            : "The model returned invalid JSON.",
          model,
          finishReason: finishReason ?? null,
        },
        { status: 502 },
      );
    }

    // Content only travels back. Design — style, anchor, focus, overlay — is
    // React's job and is deliberately absent from the response.
    const carousel = normalizeCarousel(parsed);

    if (carousel.slides.length === 0) {
      return NextResponse.json(
        {
          error:
            "The model could not write slides from the available material. Search a dish first, or try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      model: data.model || model,
      type: typeKey,
      regenerateIndex: regenerating ? regenerateIndex : null,
      ...carousel,
    });
  } catch (error) {
    console.error("Carousel error:", error);

    return NextResponse.json(
      { error: "Something went wrong while creating the carousel." },
      { status: 500 },
    );
  }
}
