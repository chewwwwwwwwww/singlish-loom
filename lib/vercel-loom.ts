/**
 * Vercel runs the native Next frontend; the event's existing Cloudflare app
 * remains the single owner of D1, R2 and generation. This module is selected
 * only by next.config.ts's server build alias. It needs no API credentials.
 */
export const LOOM_UPSTREAM_ORIGIN = "https://singlish-loom-bc.activepearl4.chatgpt.site";

const API_METHODS = new Map<string, "GET" | "POST">([
  ["/api/artwork", "GET"], ["/api/thread", "GET"], ["/api/mural", "GET"],
  ["/api/tapestry", "GET"], ["/api/wall", "GET"], ["/api/status", "GET"],
  ["/api/check", "POST"], ["/api/generate", "POST"],
  ["/generate", "POST"], // Preserve the original documented submission URL.
]);
const RESPONSE_HEADERS = ["content-type", "cache-control", "etag", "last-modified", "vary", "x-content-type-options", "retry-after"];
const MAX_BODY_BYTES = 2048;
const REQUEST_TIMEOUT_MS = 120_000;

function requestOrigin(request: Request, incoming: URL): string | null {
  const host = request.headers.get("host");
  if (!host) return incoming.origin;
  // Native Next can normalize Request.url to its internal hostname. HTTP Host
  // retains the actual visitor-facing domain. Never substitute a caller's
  // x-forwarded-host or accept userinfo/path components in this comparison.
  if (!/^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::[0-9]{1,5})?$/i.test(host)) return null;
  try { return new URL(`${incoming.protocol}//${host}`).origin; } catch { return null; }
}

function error(message: string, status: number, extraHeaders: Record<string, string> = {}): Response {
  return Response.json({ error: message }, { status, headers: {
    "cache-control": "no-store", "x-content-type-options": "nosniff", ...extraHeaders,
  } });
}

async function boundedJsonBody(request: Request): Promise<string | Response> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return error("Send your phrase as JSON.", 415);
  }
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) return error("This phrase is too long.", 413);
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return error("This phrase is too long.", 413);
      }
      chunks.push(next.value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch { return error("Your phrase could not be read. Try again.", 400); }
  finally { reader.releaseLock(); }
}

/** Allowlisted endpoint forwarding, shared by the native Next handlers. */
export async function forwardLoomRequest(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const incoming = new URL(request.url);
  const allowedMethod = API_METHODS.get(incoming.pathname);
  if (!allowedMethod) return error("This loom endpoint could not be found.", 404);
  if (request.method !== allowedMethod) return error("This method is not supported.", 405, { Allow: allowedMethod });
  const headers = new Headers({ accept: incoming.pathname === "/api/artwork" ? "image/*" : "application/json" });
  let body: string | undefined;
  if (allowedMethod === "POST") {
    const origin = request.headers.get("origin");
    if (origin && origin !== requestOrigin(request, incoming)) return error("Open Singlish Loom directly to weave a phrase.", 403);
    const checkedBody = await boundedJsonBody(request);
    if (checkedBody instanceof Response) return checkedBody;
    body = checkedBody;
    headers.set("content-type", "application/json");
    // The upstream applies its own same-origin validation after this proxy
    // has checked the visitor's Vercel origin. Cookies and credentials never
    // enter this allowlisted set of forwarded request headers.
    headers.set("origin", LOOM_UPSTREAM_ORIGIN);
  }
  const upstreamPath = incoming.pathname === "/generate" ? "/api/generate" : incoming.pathname;
  const upstreamUrl = new URL(upstreamPath + incoming.search, LOOM_UPSTREAM_ORIGIN);
  try {
    const upstream = await fetcher(upstreamUrl, {
      method: allowedMethod, headers, body,
      cache: "no-store", redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
    // The backend has no redirecting API endpoints. Reject a redirect rather
    // than follow it to a new host or expose a deployment-specific location.
    if (upstream.status >= 300 && upstream.status < 400 && upstream.status !== 304) {
      await upstream.body?.cancel();
      return error("The loom is reconnecting. Try again in a moment.", 502);
    }
    const responseHeaders = new Headers();
    for (const key of RESPONSE_HEADERS) {
      const value = upstream.headers.get(key);
      if (value !== null) responseHeaders.set(key, value);
    }
    responseHeaders.set("x-content-type-options", "nosniff");
    return new Response([204, 205, 304].includes(upstream.status) ? null : upstream.body, {
      status: upstream.status, headers: responseHeaders,
    });
  } catch { return error("The loom is reconnecting. Try again in a moment.", 503); }
}

// Next passes a route context as its second handler argument. Do not expose
// the injectable test fetcher as that argument on the actual route exports.
const handleRequest = (request: Request) => forwardLoomRequest(request);
export const postGenerate = handleRequest;
export const postCheck = handleRequest;
export const getTapestry = handleRequest;
export const getMural = handleRequest;
export const getWall = handleRequest;
export const getThread = handleRequest;
export const getStatus = handleRequest;
export const getArtwork = handleRequest;
