// Shared OpenRouter call used by /api/analyze and /api/carousel.
//
// The free-tier models on OpenRouter route to rotating providers that
// intermittently answer 502/503/429. A single failed attempt used to surface
// as an error in the UI even though the same request succeeds seconds later,
// so we retry transient failures a couple of times before giving up.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export type OpenRouterResult = {
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

type OpenRouterChatOptions = {
  apiKey: string;
  payload: Record<string, unknown>;
  attempts?: number;
};

export async function openRouterChat({
  apiKey,
  payload,
  attempts = 3,
}: OpenRouterChatOptions): Promise<OpenRouterResult> {
  let last: OpenRouterResult = { ok: false, status: 502, data: null };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      // Linear backoff: 1s, 2s — short enough to stay inside a user's patience.
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }

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
        signal: AbortSignal.timeout(180000),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        return { ok: true, status: response.status, data };
      }

      last = { ok: false, status: response.status, data };

      const message = data?.error?.message || data;
      console.error(
        `OpenRouter attempt ${attempt + 1}/${attempts} failed (${response.status}):`,
        message,
      );

      if (!RETRYABLE_STATUS.has(response.status)) {
        return last;
      }
    } catch (error) {
      // Network error or timeout — worth one more try.
      last = { ok: false, status: 0, data: null };
      console.error(`OpenRouter attempt ${attempt + 1}/${attempts} errored:`, error);
    }
  }

  return last;
}

export function openRouterErrorMessage(result: OpenRouterResult): string {
  return result.data?.error?.message || "OpenRouter request failed.";
}
