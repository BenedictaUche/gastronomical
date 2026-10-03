import { NextRequest, NextResponse } from "next/server"

// Only models that are actually wired up for analysis. The frontend marks
// everything else as unavailable so it cannot be selected.
const DEFAULT_MODEL = "qwen/qwen3.8-27b:free"
const ALLOWED_MODELS = new Set([DEFAULT_MODEL])

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
      cookTime: asString(source.cookTime),
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

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Gastronomical",
        },
        body: JSON.stringify({
          model,
          models: [model],
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
        }),
        signal: AbortSignal.timeout(180000),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("OpenRouter error:", data?.error?.message || data)

      return NextResponse.json(
        {
          error:
            data?.error?.message || "OpenRouter request failed.",
        },
        { status: 502 }
      )
    }

    const content = data?.choices?.[0]?.message?.content

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
      return NextResponse.json(
        { error: "The model returned invalid JSON." },
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
