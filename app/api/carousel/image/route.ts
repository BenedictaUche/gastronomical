import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin image proxy for slide export.
 *
 * Canvas export only works on images the browser considers same-origin.
 * Google Images thumbnails come from `encrypted-tbn*.gstatic.com` and send no
 * CORS headers, so drawing them straight to a canvas taints it and the PNG
 * comes out blank. Fetching the bytes through this route makes the `<img>`
 * same-origin, which keeps the canvas clean.
 *
 * The `src` is creator-supplied, so it is treated as untrusted: only http(s),
 * only real image content types, only public hosts, a hard byte cap, and every
 * redirect hop is re-checked.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_TYPES = /^image\/(jpeg|jpg|png|webp|gif|avif)$/i;

/**
 * Reserved and private IPv4 ranges that must never be reachable through this
 * proxy: loopback, RFC1918, link-local, CGNAT, documentation, multicast and
 * broadcast. Anything literal and public is allowed.
 */
function isPublicIpv4(host: string): boolean {
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = octets;

  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && octets[2] === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && octets[2] === 100) return false;
  if (a === 203 && b === 0 && octets[2] === 113) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a >= 224) return false;

  return true;
}

function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal") {
    return false;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isPublicIpv4(host);
  if (host === "::1" || host === "::") return false;
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10).
  if (/^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) return false;

  return host.includes(".");
}

function parseSafeUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!isPublicHost(url.hostname)) return null;

  return url;
}

async function readCapped(response: Response): Promise<ArrayBuffer | null> {
  const declared = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declared) && declared > MAX_BYTES) return null;

  const body = response.body;
  if (!body) return null;

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("src");

  if (!raw) {
    return NextResponse.json({ error: "src is required." }, { status: 400 });
  }

  let target: URL | null = parseSafeUrl(raw);

  if (!target) {
    return NextResponse.json({ error: "Unsupported image source." }, { status: 400 });
  }

  try {
    // Redirects are followed by hand so each hop is re-validated; otherwise a
    // public host could bounce the fetch onto an internal address.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const source: URL = target;
      const upstream: Response = await fetch(source, {
        redirect: "manual",
        headers: {
          Accept: "image/*",
          "User-Agent": "Gastronomical/1.0 slide export",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (upstream.status >= 300 && upstream.status < 400) {
        const location: string | null = upstream.headers.get("location");
        const next: URL | null = location
          ? parseSafeUrl(new URL(location, source).toString())
          : null;

        if (!next) {
          return NextResponse.json({ error: "Unsupported image source." }, { status: 400 });
        }

        target = next;
        continue;
      }

      if (!upstream.ok) {
        return NextResponse.json({ error: "Image could not be fetched." }, { status: 502 });
      }

      const contentType = upstream.headers.get("content-type") || "";
      if (!ALLOWED_TYPES.test(contentType)) {
        return NextResponse.json({ error: "Source is not an image." }, { status: 415 });
      }

      const body = await readCapped(upstream);
      if (!body) {
        return NextResponse.json({ error: "Image is too large." }, { status: 413 });
      }

      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    return NextResponse.json({ error: "Too many redirects." }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "Image could not be fetched." }, { status: 502 });
  }
}