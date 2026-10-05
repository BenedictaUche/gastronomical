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
  prepTime: string
  cookTime: string
  author: string
  image: string
  yield: string
}


const MAX_IMAGES = 18
const MAX_SOURCES = 10
const MAX_SCRAPED_SOURCES = 8
const FETCH_TIMEOUT_MS = 10000

type SerpOperation = "images" | "web"

const SERPAPI_BASE_URL = "https://serpapi.com/search.json"

const SERP_ENGINES: Record<SerpOperation, string> = {
  images: "google_images",
  web: "google",
}

// Both engines run concurrently, so this is the ceiling for the pair rather
// than a per-request delay. The previous hard-coded 20s aborted them mid-flight
// and turned a slow engine into a failed search, so the budget is configurable
// and starts with headroom above the old cap.
const SERPAPI_TIMEOUT_MS = readIntEnv("SERPAPI_TIMEOUT_MS", 25000, 1000)

// Exactly one retry rides out a dropped socket or a SerpApi hiccup. More than
// that only makes a bad key slower without ever succeeding.
const SERPAPI_ATTEMPTS = readIntEnv("SERPAPI_ATTEMPTS", 2, 1)
const SERPAPI_RETRY_DELAY_MS = readIntEnv("SERPAPI_RETRY_DELAY_MS", 750, 0)

// Same transient set the OpenRouter helper already uses: safe to try again.
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

type SerpFailureReason =
  | "timeout"
  | "network"
  | "http"
  | "api_error"
  | "parse"
  | "unexpected"

type SerpOutcome = {
  operation: SerpOperation
  engine: string
  ok: boolean
  status: number
  elapsedMs: number
  attempts: number
  timedOut: boolean
  reason?: SerpFailureReason
  message?: string
  data?: Record<string, unknown>
}

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

// JSON-LD times are usually ISO 8601 durations ("PT1H30M"). Show them the way
// a cook would read them, but never alter the meaning of the source value.
function formatDuration(value: unknown): string {
  if (typeof value !== "string") return ""

  const trimmed = value.trim()
  const iso = trimmed.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i)

  if (iso) {
    const [, days, hours, minutes, seconds] = iso
    const parts: string[] = []
    if (days) parts.push(`${days} day${days === "1" ? "" : "s"}`)
    if (hours) parts.push(`${hours} hr`)
    if (minutes) parts.push(`${minutes} min`)
    if (seconds && !hours && !minutes) parts.push(`${seconds} sec`)
    return parts.join(" ")
  }

  return clean(trimmed)
}

function extractAuthor(value: unknown): string {
  if (typeof value === "string") return clean(value)

  if (Array.isArray(value)) {
    return value
      .map(extractAuthor)
      .filter(Boolean)
      .join(", ")
  }

  if (value && typeof value === "object") {
    const name = (value as Record<string, unknown>).name
    if (typeof name === "string") return clean(name)
  }

  return ""
}

// recipe.image may be a string, an array, or an ImageObject ({url}).
function extractImage(value: unknown): string {
  if (typeof value === "string") return clean(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImage(item)
      if (found) return found
    }
    return ""
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    if (typeof obj.url === "string") return clean(obj.url)
    if (typeof obj.contentUrl === "string") return clean(obj.contentUrl)
  }

  return ""
}

function extractYield(value: unknown): string {
  if (typeof value === "string") return clean(value)
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? clean(entry) : ""))
      .filter(Boolean)
      .join(", ")
  }
  return ""
}

function readIntEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name]
  if (!raw) return fallback

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// The key lives in the request URL and SerpApi echoes query text back in error
// bodies, so nothing carrying the key is allowed to reach the logs.
function scrubSecret(text: string, secret: string): string {
  if (!secret) return text
  return text.split(secret).join("[redacted]")
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const name = (error as { name?: unknown }).name
  return name === "TimeoutError" || name === "AbortError"
}

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}

// SerpApi answers quota, plan and credential problems with a 200 and an `error`
// field, so the HTTP status alone cannot tell us whether a request succeeded.
function serpApiErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return ""

  const record = data as Record<string, unknown>
  const metadata =
    record.search_metadata && typeof record.search_metadata === "object"
      ? (record.search_metadata as Record<string, unknown>)
      : {}

  for (const candidate of [record.error, metadata.error]) {
    if (typeof candidate === "string" && candidate.trim()) return clean(candidate)

    if (candidate && typeof candidate === "object") {
      const nested = (candidate as Record<string, unknown>).message
      if (typeof nested === "string" && nested.trim()) return clean(nested)
    }
  }

  if (typeof metadata.status === "string" && metadata.status.toLowerCase() === "error") {
    return "SerpApi reported a search error without a message."
  }

  return ""
}

// A retry cannot fix these, so spending another attempt only delays the answer.
function isPermanentSerpMessage(message: string): boolean {
  return /api[\s_-]?key|invalid|unauthor|forbidden|credential|quota|remaining|subscription|billing|account/i.test(
    message
  )
}

function describeSerpFailure(outcome: SerpOutcome): string {
  if (outcome.timedOut) return `timed out after ${SERPAPI_TIMEOUT_MS}ms`
  if (outcome.reason === "http") return `returned HTTP ${outcome.status}`
  if (outcome.reason === "api_error") return "reported an API error"
  if (outcome.reason === "parse") return "returned a response that was not JSON"
  if (outcome.reason === "network") return "could not be reached"
  return "failed"
}

// Operation, elapsed time, HTTP status, timeout flag, attempt — and never the
// key, which only ever exists in the request URL.
function logSerpOutcome(outcome: SerpOutcome, attempt: number) {
  const summary = {
    operation: outcome.operation,
    engine: outcome.engine,
    attempt,
    maxAttempts: SERPAPI_ATTEMPTS,
    elapsedMs: outcome.elapsedMs,
    status: outcome.status,
    timedOut: outcome.timedOut,
    reason: outcome.ok ? "ok" : outcome.reason,
  }

  if (outcome.ok) {
    console.info(`[serpapi] ${JSON.stringify(summary)}`)
    return
  }

  console.error(`[serpapi] ${JSON.stringify(summary)} ${outcome.message ?? ""}`.trimEnd())
}

/**
 * One SerpApi call with an explicit, per-attempt timeout and a single retry for
 * transient faults. Never throws: every outcome — including a timeout or a
 * credential rejection — is returned as data so a sibling search can still be
 * used.
 */
async function runSerpSearch(
  operation: SerpOperation,
  query: string,
  apiKey: string
): Promise<SerpOutcome> {
  const engine = SERP_ENGINES[operation]

  const url = new URL(SERPAPI_BASE_URL)
  url.searchParams.set("engine", engine)
  url.searchParams.set("q", query)
  url.searchParams.set("api_key", apiKey)

  const failed = (
    reason: SerpFailureReason,
    message: string,
    elapsedMs: number,
    attempt: number,
    status = 0,
    timedOut = false
  ): SerpOutcome => ({
    operation,
    engine,
    ok: false,
    status,
    elapsedMs,
    attempts: attempt,
    timedOut,
    reason,
    message,
  })

  let last: SerpOutcome = failed(
    "unexpected",
    "The search did not run.",
    0,
    0
  )

  for (let attempt = 1; attempt <= SERPAPI_ATTEMPTS; attempt += 1) {
    if (attempt > 1) await delay(SERPAPI_RETRY_DELAY_MS * (attempt - 1))

    const attemptStartedAt = Date.now()

    // The signal covers the body read as well as the headers, so a slow JSON
    // payload fails the same way a slow handshake does.
    const signal = AbortSignal.timeout(SERPAPI_TIMEOUT_MS)

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal,
      })

      const status = response.status

      let data: unknown = null
      let bodyUnreadable = false

      try {
        data = await response.json()
      } catch (error) {
        // A timeout can land mid-body and is worth another attempt; a truncated
        // or non-JSON payload is not.
        if (signal.aborted || isTimeoutError(error)) throw error
        bodyUnreadable = true
      }

      const elapsedMs = Date.now() - attemptStartedAt

      if (bodyUnreadable) {
        last = failed(
          "parse",
          `SerpApi answered HTTP ${status} with a body that is not JSON.`,
          elapsedMs,
          attempt,
          status
        )
        logSerpOutcome(last, attempt)
        return last
      }

      if (!response.ok) {
        last = failed(
          "http",
          scrubSecret(
            serpApiErrorMessage(data) || `SerpApi responded with HTTP ${status}.`,
            apiKey
          ),
          elapsedMs,
          attempt,
          status
        )
        logSerpOutcome(last, attempt)

        if (!RETRYABLE_STATUS.has(status)) return last
        continue
      }

      const apiError = serpApiErrorMessage(data)

      if (apiError) {
        last = failed("api_error", scrubSecret(apiError, apiKey), elapsedMs, attempt, status)
        logSerpOutcome(last, attempt)

        if (isPermanentSerpMessage(apiError)) return last
        continue
      }

      if (!data || typeof data !== "object") {
        last = failed(
          "parse",
          "SerpApi returned a successful response without a JSON object.",
          elapsedMs,
          attempt,
          status
        )
        logSerpOutcome(last, attempt)
        return last
      }

      last = {
        operation,
        engine,
        ok: true,
        status,
        elapsedMs,
        attempts: attempt,
        timedOut: false,
        data: data as Record<string, unknown>,
      }
      logSerpOutcome(last, attempt)
      return last
    } catch (error) {
      const elapsedMs = Date.now() - attemptStartedAt
      const timedOut = signal.aborted || isTimeoutError(error)

      last = failed(
        timedOut ? "timeout" : "network",
        scrubSecret(describeError(error), apiKey),
        elapsedMs,
        attempt,
        0,
        timedOut
      )
      logSerpOutcome(last, attempt)
      // Timeouts and network faults are the transient case: fall through to
      // the single retry.
    }
  }

  return last
}

function rejectedSerpOutcome(
  operation: SerpOperation,
  settled: PromiseRejectedResult
): SerpOutcome {
  return {
    operation,
    engine: SERP_ENGINES[operation],
    ok: false,
    status: 0,
    elapsedMs: 0,
    attempts: 0,
    timedOut: false,
    reason: "unexpected",
    message: scrubSecret(describeError(settled.reason), process.env.SERPAPI_KEY ?? ""),
  }
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
      const description = recipe.description

      return {
        ...source,
        contentType: "recipe",
        ingredients: Array.isArray(recipe.recipeIngredient)
          ? recipe.recipeIngredient.map(clean).filter(Boolean)
          : [],
        instructions: toInstructionList(recipe.recipeInstructions),
        prepTime: formatDuration(recipe.prepTime),
        cookTime: formatDuration(recipe.cookTime ?? recipe.totalTime),
        author: extractAuthor(recipe.author),
        image: extractImage(recipe.image),
        yield: extractYield(recipe.recipeYield),
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

    // Quoting the dish keeps multi-word dish names intact — but Google's
    // exact-match mode returns very few results, and for a recipe hunt the
    // scarce slots get filled by videos and social posts instead. So: quote
    // for open-ended research queries, go unquoted + say "recipe" when the
    // creator asked for recipes.
    const bareDish = dish.trim().replace(/"/g, "")
    const kindHint = typeof kind === "string" ? kind.toLowerCase() : ""
    const wantsRecipe = kindHint.includes("recipe")
    const recipeHint = wantsRecipe ? (kindHint.includes("roundup") ? "recipes" : "recipe") : ""
    const quotedDish = `"${bareDish}"`
    const searchQuery = wantsRecipe
      ? [bareDish, context, recipeHint].filter(Boolean).join(" ").trim()
      : [quotedDish, context].filter(Boolean).join(" ").trim()

    // The two engines are independent, so neither may cancel the other. A
    // settled outcome keeps a successful sibling usable when the other engine
    // times out or is rejected outright.
    const [imageSettled, webSettled] = await Promise.allSettled([
      runSerpSearch("images", searchQuery, apiKey),
      runSerpSearch("web", searchQuery, apiKey),
    ])

    const imageSearch =
      imageSettled.status === "fulfilled"
        ? imageSettled.value
        : rejectedSerpOutcome("images", imageSettled)
    const webSearch =
      webSettled.status === "fulfilled" ? webSettled.value : rejectedSerpOutcome("web", webSettled)

    const failedOperations: string[] = []
    const warnings: string[] = []

    if (!imageSearch.ok) {
      failedOperations.push("images")
      warnings.push(
        `Image search ${describeSerpFailure(imageSearch)}, so this run has no images.`
      )
    }

    if (!webSearch.ok) {
      failedOperations.push("web")
      warnings.push(
        `Source search ${describeSerpFailure(webSearch)}, so this run has no web sources or recipes.`
      )
    }

    // Neither half came back: there is nothing true to return, so this is a
    // structured failure the studio can show as-is.
    if (failedOperations.length === 2) {
      return NextResponse.json(
        {
          error: `Search is unavailable right now. Image search ${describeSerpFailure(
            imageSearch
          )} and source search ${describeSerpFailure(webSearch)}.`,
          code: "SERPAPI_UNAVAILABLE",
          failedOperations,
          failures: {
            images: {
              reason: imageSearch.reason,
              status: imageSearch.status,
              timedOut: imageSearch.timedOut,
              message: imageSearch.message,
            },
            web: {
              reason: webSearch.reason,
              status: webSearch.status,
              timedOut: webSearch.timedOut,
              message: webSearch.message,
            },
          },
        },
        { status: 502 }
      )
    }

    const imagesData = imageSearch.ok ? imageSearch.data : null
    const webData = webSearch.ok ? webSearch.data : null

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
        prepTime: "",
        cookTime: "",
        author: "",
        image: "",
        yield: "",
      })
    }

    // Only the first few sources are scraped. A failed scrape keeps the
    // search snippet and never fails the whole request. Social/video pages
    // almost never carry recipe data, so they are scraped last — that way a
    // bare dish search still reaches the recipe pages sitting just below them.
    const scrapeOrder = [
      ...sources.map((_, index) => index).filter((index) => sources[index].contentType !== "social"),
      ...sources.map((_, index) => index).filter((index) => sources[index].contentType === "social"),
    ].slice(0, MAX_SCRAPED_SOURCES)

    const enriched = await Promise.all(
      sources.map((source, index) =>
        scrapeOrder.includes(index) ? enrichSource(source) : Promise.resolve(source)
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
      // Additive only: the studio reads `images` and `sources` exactly as it
      // did before. These describe a run that came back incomplete, so the
      // reason can be shown instead of guessed at.
      partial: failedOperations.length > 0,
      failedOperations,
      warnings,
    })
  } catch (error) {
    console.error("Research API error:", error)

    return NextResponse.json(
      { error: "Something went wrong while researching." },
      { status: 500 }
    )
  }
}
