// Shared OpenRouter call used by /api/analyze and /api/carousel.
//
// Two completely different situations arrive as HTTP 429, and they need
// opposite handling:
//
//   1. `limit_source: "openrouter_free_tier_daily"` — the account's daily cap
//      on free-model requests (50/day by default). It does NOT clear by
//      waiting; it resets at a fixed moment. Retrying it only burns the
//      user's time, which is why this used to produce three 429s and a 502
//      nine seconds later.
//   2. A single provider answering "temporarily rate-limited upstream" —
//      that one clears on its own, so exactly one short retry is worth it.
//
// OpenRouter does not send `Retry-After` for either case; it sends
// `x-ratelimit-reset` as a Unix millisecond timestamp. Both are read here, and
// both are capped so a demo never sits waiting on a provider.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const RETRYABLE_STATUS = new Set([408, 409, 425, 500, 502, 503, 504]);

/** Attempts allowed when the upstream itself failed (5xx / transport). */
const MAX_ATTEMPTS = readIntEnv("OPENROUTER_ATTEMPTS", 3, 1);

/** Attempts allowed for a provider that is only temporarily saturated. */
const RATE_LIMIT_ATTEMPTS = readIntEnv("OPENROUTER_RATE_LIMIT_ATTEMPTS", 2, 1);

/** Attempts allowed for the daily free-model cap. One: it never clears. */
const DAILY_QUOTA_ATTEMPTS = 1;

/**
 * Longest this module will ever sit on a rate limit before giving up. A demo
 * that fails in two seconds beats one that fails in thirty.
 */
const MAX_RATE_LIMIT_WAIT_MS = readIntEnv("OPENROUTER_RATE_LIMIT_WAIT_MS", 2000, 0);

const BACKOFF_MS = [1000, 2000];

/**
 * Output cap for the JSON replies. Generous enough for a ten-source analysis
 * or a full carousel, but it stops a runaway generation from holding the
 * request open for the full 180s timeout.
 */
export const OPENROUTER_MAX_TOKENS = readIntEnv("OPENROUTER_MAX_TOKENS", 8192, 256);

export type OpenRouterFailureReason =
  | "daily_quota_exhausted"
  | "provider_rate_limited"
  | "rate_limited"
  | "server_error"
  | "client_error"
  | "network"
  | "timeout"
  | "malformed_response";

export type OpenRouterFailure = {
  reason: OpenRouterFailureReason;
  status: number;
  /** OpenRouter's `error.message`. */
  message: string;
  /** OpenRouter's `error.code`, when present. */
  code: string | number | null;
  /** `error.metadata.provider_name` — which upstream actually failed. */
  provider: string | null;
  /** `error.metadata.limit_source`, e.g. `openrouter_free_tier_daily`. */
  limitSource: string | null;
  /** `error.metadata.remedy_hint` — OpenRouter's own advice. */
  remedy: string | null;
  /** `error.metadata.raw` — the provider's own error text, when present. */
  providerDetail: string | null;
  /** `x-ratelimit-limit` / `x-ratelimit-remaining` / `x-ratelimit-reset`. */
  rateLimit: { limit: string | null; remaining: string | null; reset: string | null } | null;
  /** How long OpenRouter asked us to wait, in ms. */
  retryAfterMs: number | null;
  /** ISO time the quota frees up, when OpenRouter told us. */
  resetsAt: string | null;
  /** Whether another identical attempt could plausibly succeed. */
  retryable: boolean;
  /** The raw response body, kept for shapes this parser does not know. */
  rawBody: string | null;
};

export type OpenRouterResult = {
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  failure?: OpenRouterFailure;
  /** Wall-clock cost of the whole call, retries included. */
  elapsedMs?: number;
};

type OpenRouterChatOptions = {
  apiKey: string;
  payload: Record<string, unknown>;
  attempts?: number;
};

function readIntEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 500) : null;
  }
  return null;
}

/**
 * Codes arrive as a number from OpenRouter but as a string from some proxies.
 * The value is kept as-is so the diagnostics reflect what actually arrived.
 */
function asCode(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 80) : null;
  }
  return null;
}

function truncate(value: string, max = 600): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * `Retry-After` is honoured when present (seconds or HTTP-date). OpenRouter
 * instead sends `x-ratelimit-reset` as Unix milliseconds, which is used as the
 * fallback. Returns null when neither header says anything useful.
 */
function retryAfterMsFrom(
  headers: Headers,
  metadata: Record<string, unknown>
): { waitMs: number | null; resetsAt: string | null } {
  const embedded = lowerCaseKeys(metadata.headers);
  const headerValue = (name: string) => headers.get(name) ?? embedded[name] ?? null;

  const retryAfter = headerValue("retry-after");

  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(seconds)) {
      return { waitMs: Math.max(0, seconds * 1000), resetsAt: null };
    }

    const asDate = Date.parse(retryAfter);
    if (Number.isFinite(asDate)) {
      return {
        waitMs: Math.max(0, asDate - Date.now()),
        resetsAt: new Date(asDate).toISOString(),
      };
    }
  }

  const reset = headerValue("x-ratelimit-reset");
  if (reset) {
    const resetMs = Number.parseInt(reset, 10);
    if (Number.isFinite(resetMs) && resetMs > 0) {
      const at = new Date(resetMs);
      return { waitMs: Math.max(0, resetMs - Date.now()), resetsAt: at.toISOString() };
    }
  }

  return { waitMs: null, resetsAt: null };
}

/**
 * `error.metadata.headers` uses mixed-case names ("X-RateLimit-Limit"), so the
 * lookup cannot be a plain key read.
 */
function lowerCaseKeys(value: unknown): Record<string, string> {
  const source = asRecord(value);
  const out: Record<string, string> = {};

  for (const [key, entry] of Object.entries(source)) {
    const text = asText(entry);
    if (text) out[key.toLowerCase()] = text;
  }
  return out;
}

/**
 * Rate-limit state, preferring the real response headers and falling back to
 * the copy OpenRouter embeds in `error.metadata.headers` when a proxy strips
 * them from the response.
 */
function readRateLimit(headers: Headers, metadata: Record<string, unknown>) {
  const embedded = lowerCaseKeys(metadata.headers);
  const pick = (name: string) => headers.get(name) ?? embedded[name] ?? null;

  const limit = pick("x-ratelimit-limit");
  const remaining = pick("x-ratelimit-remaining");
  const reset = pick("x-ratelimit-reset");

  if (!limit && !remaining && !reset) return null;
  return { limit, remaining, reset };
}

/**
 * Turn an OpenRouter error body into something a human can act on. The old
 * helper returned `error.message` alone, which for this API is the useless
 * string "Provider returned error" — the actionable parts live in
 * `error.code`, `error.metadata` and the rate-limit headers.
 */
function buildFailure(data: unknown, status: number, headers: Headers): OpenRouterFailure {
  const body = asRecord(data);
  const error = asRecord(body.error);
  const metadata = asRecord(error.metadata);

  const message =
    asText(error.message) ??
    asText(metadata.remedy_hint) ??
    (status ? `OpenRouter responded with HTTP ${status}.` : "OpenRouter could not be reached.");

  const code = asCode(error.code);
  const provider = asText(metadata.provider_name);
  const limitSource = asText(metadata.limit_source);
  const remedy = asText(metadata.remedy_hint);
  const providerDetail = asText(metadata.raw);

  const rateLimit = readRateLimit(headers, metadata);
  const { waitMs, resetsAt } = retryAfterMsFrom(headers, metadata);

  // The daily free-model cap is account-wide: no provider routing, no shorter
  // wait and no retry will get past it.
  const dailyQuota =
    limitSource === "openrouter_free_tier_daily" ||
    /free-models-per-day|free_tier_daily|daily free/i.test(`${message} ${asText(metadata.limit_source) ?? ""}`);

  // One provider refusing a single request is transient and worth one retry.
  const providerSaturated =
    !dailyQuota &&
    /temporarily rate-limited upstream|rate-limited upstream|overloaded|try again shortly|capacity/i.test(
      `${message} ${providerDetail ?? ""}`
    );

  const rateLimited = status === 429;
  const serverError = RETRYABLE_STATUS.has(status);

  const reason: OpenRouterFailureReason = dailyQuota
    ? "daily_quota_exhausted"
    : rateLimited
      ? providerSaturated
        ? "provider_rate_limited"
        : "rate_limited"
      : serverError
        ? "server_error"
        : "client_error";

  // Nothing recognisable came back, so the body is kept verbatim: a new
  // OpenRouter error format then still shows up in development instead of
  // collapsing into a generic status message.
  const structured = code !== null || provider !== null || limitSource !== null || providerDetail !== null;
  const rawBody = status > 0 && !structured ? JSON.stringify(data ?? null) : null;

  return {
    reason,
    status,
    message,
    code,
    provider,
    limitSource,
    remedy,
    providerDetail,
    rateLimit,
    retryAfterMs: waitMs,
    resetsAt,
    // A daily cap cannot be waited out. A provider that is merely saturated
    // can, but only for a bounded moment.
    retryable: dailyQuota ? false : rateLimited || serverError,
    rawBody,
  };
}

function networkFailure(status: number, timedOut: boolean): OpenRouterFailure {
  return {
    reason: timedOut ? "timeout" : "network",
    status,
    message: timedOut
      ? "OpenRouter did not answer before the timeout."
      : "OpenRouter could not be reached.",
    code: null,
    provider: null,
    limitSource: null,
    remedy: null,
    providerDetail: null,
    rateLimit: null,
    retryAfterMs: null,
    resetsAt: null,
    retryable: true,
    rawBody: null,
  };
}

/**
 * Full diagnostic line for a failed attempt. Never logs the API key or any
 * authorization header — only the status, timing, and the parsed error.
 */
function logFailure(
  failure: OpenRouterFailure,
  attempt: number,
  allowedAttempts: number,
  elapsedMs: number
) {
  const summary = {
    status: failure.status,
    attempt,
    maxAttempts: allowedAttempts,
    elapsedMs,
    reason: failure.reason,
    code: failure.code,
    provider: failure.provider,
    limitSource: failure.limitSource,
    rateLimit: failure.rateLimit,
    retryAfterMs: failure.retryAfterMs,
    resetsAt: failure.resetsAt,
    retryable: failure.retryable,
  };

  const extras = [
    `message=${JSON.stringify(truncate(failure.message, 300))}`,
    failure.providerDetail ? `providerDetail=${JSON.stringify(truncate(failure.providerDetail))}` : "",
    failure.remedy ? `remedy=${JSON.stringify(truncate(failure.remedy))}` : "",
    failure.rawBody ? `body=${JSON.stringify(truncate(failure.rawBody, 900))}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  console.error(`[openrouter] ${JSON.stringify(summary)} ${extras}`.trimEnd());
}

/** How many attempts a failure is allowed, which depends on the reason. */
function attemptsAllowed(failure: OpenRouterFailure, requested: number): number {
  if (failure.reason === "daily_quota_exhausted") return DAILY_QUOTA_ATTEMPTS;
  if (failure.reason === "provider_rate_limited" || failure.reason === "rate_limited") {
    return Math.min(requested, RATE_LIMIT_ATTEMPTS);
  }
  return requested;
}

/**
 * The wait before the next attempt. A rate limit that asks for longer than we
 * are willing to sit through is not retried at all — the caller fails fast
 * instead, with the reset time in the message.
 */
async function waitBeforeRetry(
  failure: OpenRouterFailure,
  attempt: number
): Promise<{ retry: boolean; waitedMs: number }> {
  if (failure.reason === "provider_rate_limited" || failure.reason === "rate_limited") {
    const requested = failure.retryAfterMs;

    if (requested !== null) {
      if (requested > MAX_RATE_LIMIT_WAIT_MS) {
        console.error(
          `[openrouter] rate limit asks for ${requested}ms, over the ${MAX_RATE_LIMIT_WAIT_MS}ms budget — failing fast`
        );
        return { retry: false, waitedMs: 0 };
      }
      await delay(requested);
      return { retry: true, waitedMs: requested };
    }

    // No guidance from OpenRouter: one short pause is still worth trying,
    // because an upstream provider that just refused usually frees up.
    const backoff = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
    await delay(backoff);
    return { retry: true, waitedMs: backoff };
  }

  const backoff = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
  await delay(backoff);
  return { retry: true, waitedMs: backoff };
}

export async function openRouterChat({
  apiKey,
  payload,
  attempts = MAX_ATTEMPTS,
}: OpenRouterChatOptions): Promise<OpenRouterResult> {
  const startedAt = Date.now();
  const maxAttempts = Math.max(1, attempts);

  let last: OpenRouterResult = {
    ok: false,
    status: 502,
    data: null,
    failure: networkFailure(502, false),
    elapsedMs: 0,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptStartedAt = Date.now();
    const signal = AbortSignal.timeout(180000);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Gastronomical",
        },
        body: JSON.stringify(payload),
        signal,
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        return { ok: true, status: response.status, data, elapsedMs: Date.now() - startedAt };
      }

      const failure = buildFailure(data, response.status, response.headers);

      last = {
        ok: false,
        status: response.status,
        data,
        failure,
        elapsedMs: Date.now() - startedAt,
      };

      const allowed = attemptsAllowed(failure, maxAttempts);

      logFailure(failure, attempt, allowed, Date.now() - attemptStartedAt);

      if (!failure.retryable) return last;
      if (attempt >= allowed) return last;

      const wait = await waitBeforeRetry(failure, attempt);
      if (!wait.retry) return last;
    } catch (error) {
      const timedOut = signal.aborted || isTimeoutError(error);
      const failure = networkFailure(0, timedOut);

      last = {
        ok: false,
        status: 0,
        data: null,
        failure,
        elapsedMs: Date.now() - startedAt,
      };

      logFailure(failure, attempt, maxAttempts, Date.now() - attemptStartedAt);

      if (attempt >= maxAttempts) return last;

      const backoff = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      await delay(backoff);
    }
  }

  return last;
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const name = (error as { name?: unknown }).name;
  return name === "TimeoutError" || name === "AbortError";
}

/**
 * A message worth showing a creator. For a daily quota this has to say when
 * the limit frees up, because nothing the user does will make it work sooner.
 */
export function openRouterErrorMessage(result: OpenRouterResult): string {
  const failure = result.failure;

  if (!failure) {
    const legacyMessage = result.data?.error?.message;
    return typeof legacyMessage === "string" ? legacyMessage : "OpenRouter request failed.";
  }

  if (failure.reason === "daily_quota_exhausted") {
    const limit = failure.rateLimit?.limit ? ` (${failure.rateLimit.limit} per day)` : "";
    const reset = failure.resetsAt ? ` It resets at ${failure.resetsAt}.` : "";
    return `OpenRouter's daily free-model limit is used up${limit}.${reset}`;
  }

  if (failure.reason === "provider_rate_limited") {
    const provider = failure.provider ? ` (${failure.provider})` : "";
    const detail = failure.providerDetail ? ` ${truncate(failure.providerDetail, 200)}` : "";
    return `The model provider is busy right now${provider}.${detail}`.trim();
  }

  if (failure.reason === "timeout") return "The model took too long to answer. Please try again.";
  if (failure.reason === "network") return "The model provider could not be reached. Please try again.";

  // Keep the upstream wording — it is usually the most specific part.
  return failure.message;
}

/**
 * Compact, secret-free diagnostics for the API response so a failure can be
 * understood from the client console during development.
 */
export function openRouterDiagnostics(result: OpenRouterResult) {
  const failure = result.failure;
  if (!failure) return undefined;

  return {
    status: failure.status,
    reason: failure.reason,
    code: failure.code,
    provider: failure.provider,
    limitSource: failure.limitSource,
    remedy: failure.remedy,
    providerDetail: failure.providerDetail ? truncate(failure.providerDetail) : null,
    rateLimit: failure.rateLimit,
    retryAfterMs: failure.retryAfterMs,
    resetsAt: failure.resetsAt,
    retryable: failure.retryable,
    elapsedMs: result.elapsedMs ?? null,
  };
}