import { NextRequest, NextResponse } from "next/server";

import { openRouterChat, openRouterErrorMessage } from "@/lib/openrouter";

/**
 * Carousel outline generation.
 *
 * Separate from /api/research and /api/analyze on purpose: research collects
 * evidence, analysis reads it, and this route turns the creator's *saved*
 * evidence into a possible carousel structure. It reuses the same OpenRouter
 * configuration and the same grounding rules.
 */

const DEFAULT_MODEL = "qwen/qwen3.8-27b:free";
const ALLOWED_MODELS = new Set([DEFAULT_MODEL]);

const MAX_FINDINGS = 25;
const MAX_SOURCES = 12;
const MAX_NOTES = 15;
const MAX_SNIPPET_CHARS = 400;

type OutlineSlide = {
  title: string
  body: string
  evidence: string[]
};

type Outline = {
  title: string
  slides: OutlineSlide[]
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
function normalizeOutline(raw: unknown): Outline {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const slides = Array.isArray(raw) ? raw : Array.isArray(record.slides) ? record.slides : [];

  return {
    title: asString(record.title),
    slides: slides
      .map((item): OutlineSlide | null => {
        const slide = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const title = asString(slide.title) || asString(slide.heading);
        const body = asString(slide.body) || asString(slide.description) || asString(slide.text);
        if (!title && !body) return null;

        return {
          title,
          body,
          evidence: asStringArray(slide.evidence).map((entry) => entry.trim()).filter(Boolean),
        };
      })
      .filter((slide): slide is OutlineSlide => slide !== null),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { dish, context, direction, findings, notes, sources } = body;

    if (!asString(dish)) {
      return NextResponse.json({ error: "A dish is required." }, { status: 400 });
    }

    const promptFindings = Array.isArray(findings) ? findings.slice(0, MAX_FINDINGS) : [];
    const promptSources = Array.isArray(sources) ? sources.slice(0, MAX_SOURCES) : [];
    const promptNotes = asStringArray(notes)
      .slice(0, MAX_NOTES)
      .map((note) => note.trim())
      .filter(Boolean);

    if (promptFindings.length === 0 && promptSources.length === 0) {
      return NextResponse.json(
        {
          error:
            "Save at least one finding or source to the research pack before generating a carousel outline.",
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

    const requestedModel = typeof body.model === "string" ? body.model : "";
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

    const directionLabel = asString(direction) || "Food discovery";

    const prompt = `
You are helping a food creator plan an Instagram-style carousel. You are NOT writing the final captions — you are proposing a slide structure they can edit.

Topic: ${asString(dish)}
Context: ${asString(context) || "Not specified"}
Chosen direction: ${directionLabel}

Below is ONLY the material the creator saved into their research pack. This came from real web sources and from evidence-grounded analysis of those sources. Some of it may have been written by the creator themselves.

SAVED FINDINGS (AI-synthesised, each attributed to source titles):
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

SAVED SOURCES (title, publisher, and the text the creator had available):
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

CREATOR'S OWN NOTES (ideas and to-dos, not facts):
${JSON.stringify(promptNotes, null, 2)}

IMPORTANT RULES:
- Use ONLY the supplied material. Do not use outside knowledge and do not add facts.
- Do not claim a dish is traditional, authentic or regional unless a supplied source says so.
- A slide that states a factual claim must list the source title(s) it came from in "evidence".
- Slides that are purely structural (a hook, a closing question) may have an empty "evidence" array.
- The creator's notes are ideas to consider, never evidence. Never present a note as a fact.
- Slide titles must be short enough to read on a slide (roughly 6 words or fewer).
- Slide body is one or two plain sentences the creator can rewrite. No hashtags, no emoji spam.
- Produce between 5 and 9 slides.
- If the saved material is thin, produce fewer slides rather than inventing more.

Return JSON with exactly this structure:

{
  "title": "A short working title for the carousel",
  "slides": [
    {
      "title": "slide headline",
      "body": "one or two sentences",
      "evidence": ["source title", "source title"]
    }
  ]
}
`;

    const result = await openRouterChat({
      apiKey,
      payload: {
        model,
        models: [model],
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        // Same reasoning-model caveat as /api/analyze: reasoning must be off
        // or the model spends minutes thinking before returning JSON.
        reasoning: { enabled: false },
      },
    });

    if (!result.ok) {
      console.error("OpenRouter carousel error:", openRouterErrorMessage(result));

      return NextResponse.json(
        { error: openRouterErrorMessage(result) },
        { status: 502 },
      );
    }

    const data = result.data;

    const content = data?.choices?.[0]?.message?.content;

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
      return NextResponse.json(
        { error: "The model returned invalid JSON." },
        { status: 502 },
      );
    }

    const outline = normalizeOutline(parsed);

    if (outline.slides.length === 0) {
      return NextResponse.json(
        {
          error:
            "The model could not build an outline from the saved material. Try saving more findings or sources first.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ model: data.model || model, direction: directionLabel, ...outline });
  } catch (error) {
    console.error("Carousel error:", error);

    return NextResponse.json(
      { error: "Something went wrong while planning the carousel." },
      { status: 500 },
    );
  }
}