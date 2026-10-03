import { NextRequest, NextResponse } from "next/server"

type SourceType = "recipe" | "article" | "social" | "other"

type ResearchSource = {
  position: number
  title: string
  source: string
  url: string
  snippet: string
  content: string
  contentType: SourceType
  ingredients: string[]
  instructions: string[]
  cookTime: string
  yield: string
}

const MAX_IMAGES = 18
const MAX_SOURCES = 10
const MAX_SCRAPED_SOURCES = 6
const FETCH_TIMEOUT_MS = 10000

const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "pinterest.",
  "youtube.com",
]

function clean(value: unknown): string {
  if (typeof value !== "string") return ""
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function classifyUrl(url: string): SourceType {
  const lower = url.toLowerCase()
  return SOCIAL_HOSTS.some((host) => lower.includes(host)) ? "social" : "other"
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) return null

    const contentType = response.headers.get("content-type") || ""
    if (contentType && !contentType.includes("html")) return null

    return await response.text()
  } catch {
    return null
  }
}

function findRecipeJsonLd(html: string): Record<string, unknown> | null {
  const scriptMatches = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ]

  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1])

      const items = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>)["@graph"])
          ? (parsed as Record<string, unknown>)["@graph"] as unknown[]
          : [parsed]

      for (const item of items) {
        const type = (item as Record<string, unknown>)?.["@type"]

        if (
          type === "Recipe" ||
          (Array.isArray(type) && type.includes("Recipe"))
        ) {
          return item as Record<string, unknown>
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks
    }
  }

  return null
}

function extractReadableText(html: string): string {
  const articleMatch =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)

  if (!articleMatch) return ""

  const text = clean(
    articleMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
  )

  return text.length > 200 ? text.slice(0, 12000) : ""
}

function toInstructionList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((step) =>
      typeof step === "string"
        ? clean(step)
        : clean((step as Record<string, unknown>)?.text)
    )
    .filter(Boolean)
}

// Try to scrape a single source. Never throws: if extraction fails the
// search result itself (title + snippet + url) is still returned as evidence.
async function enrichSource(source: ResearchSource): Promise<ResearchSource> {
  if (!source.url) return source

  try {
    const html = await fetchPage(source.url)

    if (!html) return source

    const recipe = findRecipeJsonLd(html)

    if (recipe) {
      const cookTime = recipe.totalTime ?? recipe.cookTime
      const description = recipe.description

      return {
        ...source,
        contentType: "recipe",
        ingredients: Array.isArray(recipe.recipeIngredient)
          ? recipe.recipeIngredient.map(clean).filter(Boolean)
          : [],
        instructions: toInstructionList(recipe.recipeInstructions),
        cookTime: typeof cookTime === "string" ? clean(cookTime) : "",
        yield: typeof recipe.recipeYield === "string" ? clean(recipe.recipeYield) : "",
        content: typeof description === "string" ? clean(description) : "",
      }
    }

    const text = extractReadableText(html)

    if (text) {
      return {
        ...source,
        content: text,
        contentType: source.contentType === "social" ? "social" : "article",
      }
    }

    return source
  } catch {
    return source
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { dish, context, kind, extra } = body

    if (!dish?.trim()) {
      return NextResponse.json(
        { error: "A dish is required." },
        { status: 400 }
      )
    }

    const apiKey = process.env.SERPAPI_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "SERPAPI_KEY is not configured." },
        { status: 500 }
      )
    }

    // Quoting the dish keeps multi-word dish names intact — otherwise Google
    // dilutes the query and returns generic results about the wider cuisine.
    const quotedDish = `"${dish.trim().replace(/"/g, "")}"`
    const searchQuery = `${quotedDish} ${context}`.trim()

    const imagesUrl = new URL("https://serpapi.com/search.json")
    imagesUrl.searchParams.set("engine", "google_images")
    imagesUrl.searchParams.set("q", searchQuery)
    imagesUrl.searchParams.set("api_key", apiKey)

    const webUrl = new URL("https://serpapi.com/search.json")
    webUrl.searchParams.set("engine", "google")
    webUrl.searchParams.set("q", searchQuery)
    webUrl.searchParams.set("api_key", apiKey)

    const [imagesResponse, webResponse] = await Promise.all([
      fetch(imagesUrl.toString(), { signal: AbortSignal.timeout(20000) }),
      fetch(webUrl.toString(), { signal: AbortSignal.timeout(20000) }),
    ])

    if (!imagesResponse.ok || !webResponse.ok) {
      return NextResponse.json(
        { error: "SerpApi request failed. Check the API key or try again." },
        { status: 502 }
      )
    }

    const [imagesData, webData] = await Promise.all([
      imagesResponse.json(),
      webResponse.json(),
    ])

    const images = ((imagesData?.images_results ?? []) as Record<string, unknown>[])
      .slice(0, MAX_IMAGES)
      .map((image, index) => ({
        position: typeof image.position === "number" ? image.position : index + 1,
        title: clean(image.title),
        source: clean(image.source) || "Google Images",
        thumbnail: typeof image.thumbnail === "string" ? image.thumbnail : "",
        original: typeof image.original === "string" ? image.original : "",
        link: typeof image.link === "string" ? image.link : "",
      }))
      .filter((image) => image.thumbnail || image.original)

    const organicResults = (webData?.organic_results ?? []) as Record<string, unknown>[]

    // Dedupe by URL and normalize every search result into a source.
    // Search results without a usable page still count as evidence.
    const seenUrls = new Set<string>()
    const sources: ResearchSource[] = []

    for (const result of organicResults) {
      if (sources.length >= MAX_SOURCES) break

      const url = typeof result.link === "string" ? result.link : ""
      const dedupeKey = url || clean(result.title)

      if (!dedupeKey || seenUrls.has(dedupeKey)) continue
      seenUrls.add(dedupeKey)

      sources.push({
        position: typeof result.position === "number" ? result.position : sources.length + 1,
        title: clean(result.title) || "Untitled source",
        source:
          clean(result.source) ||
          clean(result.displayed_link) ||
          hostFromUrl(url) ||
          "Web",
        url,
        snippet: clean(result.snippet),
        content: "",
        contentType: classifyUrl(url),
        ingredients: [],
        instructions: [],
        cookTime: "",
        yield: "",
      })
    }

    // Only the first few sources are scraped. A failed scrape keeps the
    // search snippet and never fails the whole request.
    const enriched = await Promise.all(
      sources.map((source, index) =>
        index < MAX_SCRAPED_SOURCES ? enrichSource(source) : Promise.resolve(source)
      )
    )

    return NextResponse.json({
      query: {
        dish,
        context,
        kind,
        extra,
      },
      images,
      sources: enriched,
    })
  } catch (error) {
    console.error("Research API error:", error)

    return NextResponse.json(
      { error: "Something went wrong while researching." },
      { status: 500 }
    )
  }
}
