import { env } from "cloudflare:workers";
import { asc, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { threads } from "../../db/schema";
import { matchCorpus, validatePhrase } from "../../lib/corpus";
import { resolveSupportedTerm } from "../../lib/dictionary";
import { generateText, GenerationUnavailableError, phrasePalette, UnsafeGenerationError } from "../../lib/generation";
import { checkPhrase, requireCheckedTerm, UnknownPhraseError } from "../../lib/phrase-check";
import { canonicalArtPhrase, ensureArtwork, freezeArtwork, getCachedArtwork, serveArtwork, visibleArtwork } from "../../lib/artwork";
import { STUDIO_ART } from "../../lib/studio-art";
import type { GenerationMode, LoomRecord, MuralResponse, StatusResponse, TapestryResponse, TapestryThread, VoiceMode, WallResponse } from "../../lib/types";

interface LoomEnv {
  DB?: D1Database; BUCKET?: R2Bucket;
  OPENAI_API_KEY?: string; OPENAI_MODEL?: string; RATE_LIMIT_SALT?: string;
  GEMINI_API_KEY?: string; GEMINI_TEXT_MODEL?: string; GEMINI_IMAGE_MODEL?: string;
}
const runtime = env as unknown as LoomEnv;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noCache = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function json(payload: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return Response.json(payload, { status, headers: { ...noCache, ...extraHeaders } });
}

function configuredMode(): GenerationMode { return runtime.GEMINI_API_KEY || runtime.OPENAI_API_KEY ? "live" : "demo"; }

function artworkConfig() {
  return { db: runtime.DB, bucket: runtime.BUCKET, apiKey: runtime.GEMINI_API_KEY, model: runtime.GEMINI_IMAGE_MODEL };
}

function toRecord(row: typeof threads.$inferSelect): LoomRecord {
  // Idempotency identifiers remain server-side.
  return {
    id: row.id, phrase: row.phrase, meaning: row.meaning, myth: row.myth,
    voice: row.voice, voiceMode: row.voiceMode, verified: row.verified,
    source: row.source, sourceUrl: row.sourceUrl, createdAt: row.createdAt,
    palette: row.palette, mode: row.mode,
    provenance: matchCorpus(row.phrase) ? "collection" : resolveSupportedTerm(row.phrase) ? "reviewed"
      : row.source && row.sourceUrl ? "discovered" : "creative",
    artwork: visibleArtwork(row.artwork),
  };
}

async function decorateRecords(rows: (typeof threads.$inferSelect)[]): Promise<LoomRecord[]> {
  const legacyPhrases = [...new Set(rows.filter((row) => row.artwork === null).map((row) => canonicalArtPhrase(row.phrase)))];
  const art = new Map(await Promise.all(legacyPhrases.map(async (phrase) => [phrase, await getCachedArtwork(phrase, artworkConfig())] as const)));
  return rows.map((row) => ({ ...toRecord(row), artwork: row.artwork !== null
    ? visibleArtwork(row.artwork, true) : art.get(canonicalArtPhrase(row.phrase)) ?? null }));
}

async function claimSubmission(request: Request): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip || !runtime.DB) return true; // Local preview has no Cloudflare client IP.
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const salt = runtime.RATE_LIMIT_SALT ?? runtime.GEMINI_API_KEY ?? runtime.OPENAI_API_KEY ?? new URL(request.url).hostname;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}\0${day}\0${ip}`));
  const clientKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  // An atomic conditional upsert prevents concurrent requests racing the limit.
  // The allowance is generous because attendees may share one venue WiFi IP.
  const result = await runtime.DB.prepare(`
    INSERT INTO submission_limits (client_key, last_at, requests) VALUES (?, ?, 1)
    ON CONFLICT(client_key) DO UPDATE SET last_at = excluded.last_at, requests = submission_limits.requests + 1
    WHERE submission_limits.last_at <= ? AND submission_limits.requests < 1200
    RETURNING client_key
  `).bind(clientKey, now, now - 1000).first();
  return Boolean(result);
}

export async function postGenerate(request: Request): Promise<Response> {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Open Singlish Loom directly to weave a phrase." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Send your phrase as JSON." }, 415);
    if (Number(request.headers.get("content-length") ?? 0) > 2048) return json({ error: "This phrase is too long." }, 413);
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: "This phrase is too long." }, 413);
    let payload: { phrase?: unknown; voiceMode?: unknown; requestId?: unknown };
    try { payload = JSON.parse(raw); } catch { return json({ error: "Your phrase could not be read. Try again." }, 400); }
    if (!payload || typeof payload !== "object") return json({ error: "Type a Singlish phrase first." }, 400);
    const validated = validatePhrase(payload.phrase);
    if ("error" in validated) return json({ error: validated.error }, 400);
    const voiceMode: VoiceMode = payload.voiceMode === undefined ? "story" : payload.voiceMode as VoiceMode;
    if (voiceMode !== "story" && voiceMode !== "lyric") return json({ error: "Choose story or lyric." }, 400);
    const requestId = payload.requestId === undefined ? crypto.randomUUID() : payload.requestId;
    if (typeof requestId !== "string" || !UUID.test(requestId)) return json({ error: "Refresh the loom and try again." }, 400);
    const db = getDb();
    const prior = await db.select().from(threads).where(eq(threads.requestId, requestId)).get();
    if (prior) return json((await decorateRecords([prior]))[0]);
    // Re-resolve every new submission server-side. Visitor-supplied meanings,
    // verification flags and check responses never establish cultural evidence.
    // Clear spellings share one canonical phrase; other safe input is explicitly
    // a creative interpretation, even when the dictionary is unavailable.
    const entry = await requireCheckedTerm(validated.phrase, { db: runtime.DB });
    const phrase = entry.term;
    if (!await claimSubmission(request)) return json({ error: "The loom is busy. Give it a moment, then try again." }, 429, { "Retry-After": "2" });
    const generated = await generateText(phrase, voiceMode, {
      apiKey: runtime.OPENAI_API_KEY, model: runtime.OPENAI_MODEL,
      geminiApiKey: runtime.GEMINI_API_KEY, geminiModel: runtime.GEMINI_TEXT_MODEL,
      reference: entry,
    });
    // Text safety approval precedes any paid image request.
    const artwork = matchCorpus(phrase)
      ? await getCachedArtwork(phrase, artworkConfig()) : await ensureArtwork(phrase, {
        ...artworkConfig(), meaning: entry.provenance === "creative" ? undefined : entry.meaning,
      });
    const record = {
      id: crypto.randomUUID(), requestId, phrase,
      ...generated, voiceMode, verified: entry.verified,
      source: entry.source, sourceUrl: entry.sourceUrl,
      createdAt: Date.now(), palette: phrasePalette(phrase), artwork: freezeArtwork(artwork),
    };
    await db.insert(threads).values(record).onConflictDoNothing({ target: threads.requestId });
    // Concurrent retries return the same winning record and shareable ID.
    const saved = await db.select().from(threads).where(eq(threads.requestId, requestId)).get();
    if (!saved) throw new Error("The thread could not be stored.");
    return json(toRecord(saved), 201);
  } catch (error) {
    if (error instanceof UnknownPhraseError) return json(error.payload, error.payload.retryable ? 503 : 422);
    if (error instanceof UnsafeGenerationError) return json({ error: error.message }, 422);
    if (error instanceof GenerationUnavailableError) return json({ error: error.message }, 503);
    console.error("Singlish Loom generation unavailable:", error instanceof Error ? error.name : "error");
    return json({ error: "The loom is taking a short pause. Your phrase was not added; try again in a moment." }, 503);
  }
}

export async function postCheck(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Open Singlish Loom directly to check a phrase." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Send your phrase as JSON." }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return json({ error: "This phrase is too long." }, 413);
  let payload: { phrase?: unknown } | null;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: "This phrase is too long." }, 413);
    payload = JSON.parse(raw);
  } catch { return json({ error: "Your phrase could not be read. Try again." }, 400); }
  const validated = validatePhrase(payload?.phrase);
  if ("error" in validated) return json({ error: validated.error }, 400);
  const result = await checkPhrase(validated.phrase, { db: runtime.DB });
  return json(result, result.accepted ? 200 : result.retryable ? 503 : 422);
}

export async function getTapestry(): Promise<Response> {
  try {
    if (!runtime.DB) throw new Error("Database unavailable");
    const result = await runtime.DB.prepare("SELECT id, phrase, palette, created_at AS createdAt FROM threads WHERE archived_at IS NULL ORDER BY created_at ASC, id ASC").bind().all<TapestryThread>();
    const records = result.results ?? [];
    const payload: TapestryResponse = { records, total: records.length };
    return json(payload);
  } catch { return json({ error: "The collective weave is reconnecting. Please try again shortly." }, 503); }
}

export async function getMural(): Promise<Response> {
  try {
    // All saved voices participate. The gallery's old 120-record display cap
    // must never hide contributions from the shared scene.
    const rows = await getDb().select().from(threads).where(isNull(threads.archivedAt)).orderBy(asc(threads.createdAt), asc(threads.id));
    const decorated = await decorateRecords(rows);
    const records = decorated.map(({ id, phrase, palette, createdAt, meaning, verified, source, sourceUrl, artwork }) => ({
      id, phrase, palette, createdAt, meaning, verified, source, sourceUrl, artwork: artwork ?? null,
    }));
    const payload: MuralResponse = { records, total: records.length };
    return json(payload);
  } catch { return json({ error: "The kopitiam mural is reconnecting. Please try again shortly." }, 503); }
}

export async function getWall(): Promise<Response> {
  try {
    const db = getDb();
    const [rows, totals] = await Promise.all([
      db.select().from(threads).where(isNull(threads.archivedAt)).orderBy(desc(threads.createdAt), desc(threads.id)).limit(120),
      db.select({ total: sql<number>`count(*)` }).from(threads).where(isNull(threads.archivedAt)).get(),
    ]);
    const payload: WallResponse = { records: await decorateRecords(rows), total: Number(totals?.total ?? 0), mode: configuredMode() };
    return json(payload);
  } catch {
    return json({ error: "The wall is reconnecting. Please try again shortly." }, 503);
  }
}

export async function getThread(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !UUID.test(id)) return json({ error: "That thread link is not valid." }, 400);
  try {
    const row = await getDb().select().from(threads).where(eq(threads.id, id)).get();
    return row ? json((await decorateRecords([row]))[0]) : json({ error: "This thread could not be found." }, 404);
  } catch {
    return json({ error: "The loom is reconnecting. Try this link again shortly." }, 503);
  }
}

export async function getStatus(): Promise<Response> {
  let durable = false;
  try { await getDb().select({ id: threads.id }).from(threads).limit(1); durable = true; } catch { /* Health remains safe to display. */ }
  const payload: StatusResponse = {
    llm: Boolean(runtime.GEMINI_API_KEY || runtime.OPENAI_API_KEY),
    model: runtime.GEMINI_API_KEY ? runtime.GEMINI_TEXT_MODEL ?? "gemini-3.8-flash" : runtime.OPENAI_MODEL ?? "gpt-6.1-sol",
    durable, artwork: Boolean(runtime.GEMINI_API_KEY && runtime.BUCKET) || Object.keys(STUDIO_ART).length > 0,
  };
  return json(payload);
}

export async function getArtwork(request: Request): Promise<Response> { return serveArtwork(request, artworkConfig()); }
