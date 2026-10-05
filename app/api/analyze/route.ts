import { NextRequest, NextResponse } from "next/server"

import {
  OPENROUTER_MAX_TOKENS,
  openRouterChat,
  openRouterDiagnostics,
  openRouterErrorMessage,
} from "@/lib/openrouter"
import { DEFAULT_MODEL_ID, MODELS } from "@/lib/studio"

// The model lives in @/lib/studio so the selector, the start screen and both
// OpenRouter routes read from one list. Swapping the model is a one-line edit
// there plus marking the entry `available` — nothing below hardcodes an id.
const DEFAULT_MODEL = DEFAULT_MODEL_ID
const ALLOWED_MODELS = new Set(
  MODELS.filter((model) => model.available && model.id.includes("/")).map((model) => model.id)
)

const MAX_PROMPT_SOURCES = 10
const MAX_CONTENT_CHARS = 2500

type NormalizedAnalysis = {
  summary: string
  commonIngredients: {
    ingredient: string
    sourceCount: number
    sourceTitles: string[]
  }[]
  differences: {
    topic: string
    details: string
    sourceTitles: string[]
  }[]
  techniques: {
    technique: string
    details: string
    sourceTitles: string[]
  }[]
  observations: {
    observation: string
    sourceTitles: string[]
  }[]
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

// Defensively normalize whatever the model returns so the UI never crashes
// on a malformed section.
function normalizeAnalysis(raw: unknown): NormalizedAnalysis {
  const rawObject = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>

  const list = (value: unknown) => (Array.isArray(value) ? value : [])

  return {
    summary: asString(rawObject.summary),
    commonIngredients: list(rawObject.commonIngredients)
      .map((item) => {
        const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
        const sourceTitles = asStringArray(record.sourceTitles)
        const rawCount = Number(record.sourceCount)
        const sourceCount = Number.isFinite(rawCount) && rawCount > 0
          ? Math.round(rawCount)
          : Math.max(1, sourceTitles.length)

        return {
          // Some models return "name" instead of "ingredient".
          ingredient: asString(record.ingredient) || asString(record.name),
          sourceCount,
          sourceTitles,
        }
      })
      .filter((item) => item.ingredient),
    differences: list(rawObject.differences)
      .map((item) => {
        const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
        return {
          topic: asString(record.topic),
          details: asString(record.details),
          sourceTitles: asStringArray(record.sourceTitles),
        }
      })
      .filter((item) => item.topic || item.details),
    techniques: list(rawObject.techniques)
      .map((item) => {
        const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
        return {
          technique: asString(record.technique) || asString(record.name),
          details: asString(record.details),
          sourceTitles: asStringArray(record.sourceTitles),
        }
      })
      .filter((item) => item.technique),
    observations: list(rawObject.observations)
      .map((item) => {
        const record = (item && typeof item === "object" ? item : {}) as Record<string, unknown>
        return {
          observation: asString(record.observation) || asString(record.text),
          sourceTitles: asStringArray(record.sourceTitles),
        }
      })
      .filter((item) => item.observation),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { dish, context, sources } = body

    if (!dish?.trim()) {
      return NextResponse.json(
        { error: "A dish is required." },
        { status: 400 }
      )
    }

    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        { error: "At least one research source is required." },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured." },
        { status: 500 }
      )
    }

    const requestedModel = typeof body.model === "string" ? body.model : ""
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL

    // Keep the prompt focused: trim long page content and cap the payload.
    const promptSources = sources.slice(0, MAX_PROMPT_SOURCES).map((source: Record<string, unknown>, index: number) => ({
      title: asString(source.title) || `Source ${index + 1}`,
      source: asString(source.source),
      url: asString(source.url),
      snippet: asString(source.snippet).slice(0, 400),
      content: asString(source.content).slice(0, MAX_CONTENT_CHARS),
      contentType: asString(source.contentType) || "other",
      ingredients: asStringArray(source.ingredients).slice(0, 40),
      instructions: asStringArray(source.instructions).slice(0, 30),
      prepTime: asString(source.prepTime),
      cookTime: asString(source.cookTime),
      author: asString(source.author),
      yield: asString(source.yield),
    }))

    const prompt = `
You are a food research assistant.

The user is researching:

Dish: ${dish}
Context: ${context || "Not specified"}

Below are research sources retrieved from real web search results (Google). They may be structured recipes, food blog articles, news features, or social media posts.

Your job is to compare the sources and produce evidence-based research findings.

IMPORTANT RULES:
- Use ONLY the supplied research sources. Do not use outside knowledge.
- Do not invent facts, ingredients, techniques, or cultural claims.
- Do not claim cultural authenticity unless a supplied source supports that claim.
- Distinguish between information found in only one source and information repeated across multiple sources. Set "sourceCount" accordingly.
- Keep source attribution attached to every finding via "sourceTitles" (use each source's "title" field).
- Search snippets are evidence, but they are not equivalent to a full recipe.
- Never represent a social post or an article as a structured recipe unless that source actually provides recipe information (ingredients and/or instructions).
- If there is not enough evidence for a section, return an empty array for it. Do not manufacture findings just to fill the UI.
- NEVER invent ingredient measurements, serving sizes/yields, cooking times, or recipe instructions. Quote only values literally present in the supplied sources.
- If a measurement, yield, or time is not stated by the sources, mark it explicitly (e.g. "Measurement not specified by source." / "Yield not specified by source."). Never fill the gap from your own knowledge.
- Never expand a snippet into a full recipe. A snippet stays a snippet.
- Never present unsupported cultural claims as facts. Attribute such claims to the source that made them.
- Keep "summary" short and readable: 2-3 sentences maximum, written for a food creator, not a research report.

Research sources:

${JSON.stringify(promptSources, null, 2)}

Return JSON with exactly this structure:

{
  "summary": "A short research summary grounded in the sources.",
  "commonIngredients": [
    {
      "ingredient": "ingredient name",
      "sourceCount": 1,
      "sourceTitles": ["source title"]
    }
  ],
  "differences": [
    {
      "topic": "what differs",
      "details": "brief explanation",
      "sourceTitles": ["source title"]
    }
  ],
  "techniques": [
    {
      "technique": "technique",
      "details": "brief explanation",
      "sourceTitles": ["source title"]
    }
  ],
  "observations": [
    {
      "observation": "evidence-based observation",
      "sourceTitles": ["source title"]
    }
  ]
}
`

    // Request shape, verified against OpenRouter's chat completions API:
    //   Authorization: Bearer <key>      — set in openRouterChat
    //   Content-Type: application/json   — set in openRouterChat
    //   model                           — resolved from the requested id above,
    //                                    falling back to the default when the
    //                                    selector offers something not wired up
    //   messages                        — a single user turn carrying the prompt
    //   response_format                 — json_object, so the reply parses
    //   reasoning                       — must stay disabled: this is a
    //                                    reasoning model and it otherwise spends
    //                                    minutes thinking before emitting JSON
    //   max_tokens                      — bounded output so one request cannot
    //                                    hold the route open for the full timeout
    console.info(
      `[analyze] model=${model} requested=${requestedModel || "(none)"} allowed=${[
        ...ALLOWED_MODELS,
      ].join(",")} sources=${promptSources.length}`
    )

    const result = await openRouterChat({
      apiKey,
      payload: {
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
        // This model is a reasoning model: without disabling reasoning it
        // spends minutes thinking before producing the JSON.
        reasoning: {
          enabled: false,
        },
        max_tokens: OPENROUTER_MAX_TOKENS,
      },
    })

    if (!result.ok) {
      // openRouterErrorMessage is no longer the bare upstream "Provider
      // returned error" string; for an exhausted daily quota it names the
      // reset time instead.
      const message = openRouterErrorMessage(result)

      console.error(
        `[analyze] model=${model} failed after ${result.elapsedMs ?? 0}ms: ${message}`
      )

      return NextResponse.json(
        {
          error: message,
          model,
          // Secret-free diagnostics: status, code, provider, rate-limit
          // headers and the reset time. Additive, so the frontend keeps
          // reading `error` exactly as before.
          openrouter: openRouterDiagnostics(result),
        },
        { status: 502 }
      )
    }

    const data = result.data

    const content = data?.choices?.[0]?.message?.content
    const finishReason = data?.choices?.[0]?.finish_reason

    if (!content) {
      return NextResponse.json(
        { error: "The model returned an empty response." },
        { status: 502 }
      )
    }

    let analysis: unknown

    try {
      // Some models wrap JSON in code fences even with response_format.
      const cleaned = String(content)
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim()

      analysis = JSON.parse(cleaned)
    } catch {
      // Hitting max_tokens mid-object is a different problem from the model
      // emitting malformed JSON, and says so.
      const truncated = finishReason === "length"

      console.error(
        `[analyze] unparseable reply from model=${model} finishReason=${finishReason ?? "unknown"} length=${String(
          content
        ).length}`
      )

      return NextResponse.json(
        {
          error: truncated
            ? "The model ran out of output space before finishing. Try again, or raise OPENROUTER_MAX_TOKENS."
            : "The model returned invalid JSON.",
          model,
          finishReason: finishReason ?? null,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      model: data.model || model,
      analysis: normalizeAnalysis(analysis),
    })
  } catch (error) {
    console.error("Analysis error:", error)

    return NextResponse.json(
      { error: "Something went wrong while analyzing the research sources." },
      { status: 500 }
    )
  }
}
