import assert from "node:assert/strict";
import { forwardLoomRequest, getMural, LOOM_UPSTREAM_ORIGIN } from "../lib/vercel-loom";

let checks = 0;
async function test(name: string, run: () => Promise<void>) { await run(); checks++; console.log(`✓ ${name}`); }
type Captured = { url: URL; init: RequestInit | undefined };
function stub(response: Response) {
  const calls: Captured[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : String(input)), init });
    return response;
  };
  return { calls, fetcher };
}
const incoming = "https://singlish-loom.vercel.app";
function write(path: string, body = '{"phrase":"kan chiong spider","requestId":"00000000-0000-4000-8000-000000000001"}', headers: Record<string, string> = {}) {
  return new Request(incoming + path, { method: "POST", headers: { "content-type": "application/json", origin: incoming, ...headers }, body });
}

await test("only fixed loom endpoints and their own methods can reach the upstream", async () => {
  for (const path of ["/api/other", "/api/generate/extra", "/api/status/", "/api/%2e%2e/secret", "/not-api"]) {
    const { calls, fetcher } = stub(Response.json({}));
    assert.equal((await forwardLoomRequest(new Request(incoming + path), fetcher)).status, 404);
    assert.equal(calls.length, 0);
  }
  for (const [path, method, expected] of [["/api/generate", "GET", "POST"], ["/api/status", "POST", "GET"], ["/api/check", "DELETE", "POST"]]) {
    const { calls, fetcher } = stub(Response.json({}));
    const response = await forwardLoomRequest(new Request(incoming + path, { method }), fetcher);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), expected);
    assert.equal(calls.length, 0);
  }
});

await test("cross-origin writes are rejected before network calls", async () => {
  const { calls, fetcher } = stub(Response.json({}));
  for (const origin of ["https://attacker.example", "null", "https://singlish-loom.vercel.app.attacker.example"]) {
    assert.equal((await forwardLoomRequest(write("/api/generate", undefined, { origin }), fetcher)).status, 403);
  }
  assert.equal(calls.length, 0);
});

await test("native Next's internal hostname does not reject the actual same-origin HTTP Host", async () => {
  const { calls, fetcher } = stub(Response.json({ accepted: true }));
  const request = new Request("http://localhost:5174/api/check", { method: "POST", headers: {
    "content-type": "application/json", origin: "http://127.0.0.1:5174", host: "127.0.0.1:5174",
    "x-forwarded-host": "attacker.example",
  }, body: '{"phrase":"chope"}' });
  assert.equal((await forwardLoomRequest(request, fetcher)).status, 200);
  assert.equal(calls[0].url.href, LOOM_UPSTREAM_ORIGIN + "/api/check");
  const invalid = new Request(incoming + "/api/check", { method: "POST", headers: {
    "content-type": "application/json", origin: incoming, host: "attacker.example@singlish-loom.vercel.app",
  }, body: "{}" });
  assert.equal((await forwardLoomRequest(invalid, fetcher)).status, 403);
  assert.equal(calls.length, 1);
});

await test("write type and body limits apply even without a Content-Length header", async () => {
  const { calls, fetcher } = stub(Response.json({}));
  assert.equal((await forwardLoomRequest(write("/api/check", "{}", { "content-type": "text/plain" }), fetcher)).status, 415);
  assert.equal((await forwardLoomRequest(write("/api/check", "{}", { "content-length": "5000" }), fetcher)).status, 413);
  assert.equal((await forwardLoomRequest(write("/api/check", "x".repeat(2049)), fetcher)).status, 413);
  assert.equal((await forwardLoomRequest(write("/api/check", "新".repeat(700)), fetcher)).status, 413);
  assert.equal(calls.length, 0);
});

await test("same-origin writes preserve exact JSON and request IDs while stripping credentials", async () => {
  const body = '{ "phrase": "my original kopi expression", "voiceMode": "lyric", "allowCreative": true, "requestId": "00000000-0000-4000-8000-000000000001" }';
  const { calls, fetcher } = stub(Response.json({ id: "saved-id" }, { status: 201, headers: { "cache-control": "no-store", "set-cookie": "private=secret", "authorization": "secret" } }));
  const response = await forwardLoomRequest(write("/api/generate", body, {
    cookie: "login=private", authorization: "Bearer private", "x-forwarded-host": "attacker.example", "cf-connecting-ip": "spoofed",
  }), fetcher);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: "saved-id" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.href, LOOM_UPSTREAM_ORIGIN + "/api/generate");
  assert.equal(calls[0].init?.body, body);
  assert.equal(calls[0].init?.cache, "no-store");
  assert.equal(calls[0].init?.redirect, "manual");
  assert.deepEqual([...new Headers(calls[0].init?.headers)], [
    ["accept", "application/json"], ["content-type", "application/json"], ["origin", LOOM_UPSTREAM_ORIGIN],
  ]);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("authorization"), null);
  const legacy = stub(Response.json({ id: "legacy-saved-id" }, { status: 201 }));
  assert.equal((await forwardLoomRequest(write("/generate", body), legacy.fetcher)).status, 201);
  assert.equal(legacy.calls[0].url.href, LOOM_UPSTREAM_ORIGIN + "/api/generate");
});

await test("thread and artwork requests keep query IDs, content types and cache headers", async () => {
  for (const path of ["/api/thread?id=saved-id", "/api/artwork?id=" + "a".repeat(64), "/api/mural", "/api/tapestry", "/api/wall", "/api/status"]) {
    const artwork = path.startsWith("/api/artwork");
    const { calls, fetcher } = stub(new Response(artwork ? "imagebytes" : '{"records":[]}', { headers: {
      "content-type": artwork ? "image/webp" : "application/json", "cache-control": artwork ? "public, max-age=31536000, immutable" : "no-store",
      "content-length": "999", "content-encoding": "gzip", etag: "frozen",
    } }));
    const response = await forwardLoomRequest(new Request(incoming + path, { headers: { cookie: "private", authorization: "private" } }), fetcher);
    assert.equal(calls[0].url.href, LOOM_UPSTREAM_ORIGIN + path);
    assert.equal(response.headers.get("content-type"), artwork ? "image/webp" : "application/json");
    assert.equal(response.headers.get("cache-control"), artwork ? "public, max-age=31536000, immutable" : "no-store");
    assert.equal(response.headers.get("content-length"), null, "fetch may decompress its response body");
    assert.equal(response.headers.get("content-encoding"), null);
    assert.equal(new Headers(calls[0].init?.headers).get("cookie"), null);
    assert.equal(new Headers(calls[0].init?.headers).get("authorization"), null);
    assert.equal(await response.text(), artwork ? "imagebytes" : '{"records":[]}');
  }
});

await test("upstream failures remain honest and redirects cannot change the fixed upstream", async () => {
  const redirect = stub(new Response(null, { status: 302, headers: { location: "https://elsewhere.example" } }));
  assert.equal((await forwardLoomRequest(new Request(incoming + "/api/status"), redirect.fetcher)).status, 502);
  assert.equal(redirect.calls.length, 1);
  const failed: typeof fetch = async () => { throw new Error("network unavailable"); };
  assert.equal((await forwardLoomRequest(new Request(incoming + "/api/status"), failed)).status, 503);
  const rejected = stub(Response.json({ error: "Unsupported phrase", accepted: false }, { status: 422 }));
  const response = await forwardLoomRequest(write("/api/check"), rejected.fetcher);
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "Unsupported phrase", accepted: false });
});

await test("Next route context is not mistaken for an injected fetcher", async () => {
  const original = globalThis.fetch;
  const { calls, fetcher } = stub(Response.json({ records: [], total: 0 }));
  globalThis.fetch = fetcher;
  try {
    const nativeHandler = getMural as unknown as (request: Request, context: unknown) => Promise<Response>;
    const response = await nativeHandler(new Request(incoming + "/api/mural"), { params: Promise.resolve({}) });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
  } finally { globalThis.fetch = original; }
});

console.log(`${checks} Vercel proxy checks passed.`);
