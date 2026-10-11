import { compactPhrase, isBlockedPhrase, normalizePhrase, validatePhrase } from "./corpus";
import type { CorpusTerm } from "./types";

export const REFERENCE_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
const MAX_REFERENCE_BYTES = 512 * 1024;
export const REFERENCE_DAILY_LIMIT = 3000;
const REFERENCE_FIELDS = "lookup_phrase AS lookupPhrase, status, phrase, meaning, source, source_url AS sourceUrl, revision, checked_at AS checkedAt, retry_after AS retryAfter, lease_token AS leaseToken, lease_until AS leaseUntil";

export interface ReferenceEntry extends CorpusTerm { revision: number }
export type ReferenceResult = { status: "ready"; entry: ReferenceEntry } | { status: "missing" | "unavailable" };
export interface ReferenceRow {
  lookupPhrase: string; status: "pending" | "ready" | "missing" | "unavailable";
  phrase: string | null; meaning: string | null; source: string | null; sourceUrl: string | null;
  revision: number | null; checkedAt: number; retryAfter: number; leaseToken: string | null; leaseUntil: number;
}

export function isPublicReferenceSafe(phrase: string, meaning: string): boolean {
  return !isBlockedPhrase(phrase) && !isBlockedPhrase(meaning)
    && !/\b(?:penis|penises|vagina|vaginas|genital(?:s|ia)?|sexual|intercourse|semen|ejaculat\w*|masturbat\w*|pornograph\w*|prostitut\w*|racial slur|ethnic slur|suicide)\b/i.test(meaning);
}

function decodeEntities(text: string): string {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_all, value: string) => {
    const code = value.startsWith("x") ? parseInt(value.slice(1), 16) : Number(value);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  }).replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g, entity => ({ "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" })[entity]!);
}

// Deliberately small renderer. Unknown templates pause recognition rather than
// allowing a model to fill in a dictionary definition or hide a sense qualifier.
function definitionText(wikitext: string): string | null {
  let text = wikitext.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "").replace(/<ref\b[^>]*\/\s*>/gi, "");
  for (let pass = 0; pass < 6 && /\{\{/.test(text); pass++) {
    let unsupported = false;
    text = text.replace(/\{\{([^{}]+)\}\}/g, (_all, body: string) => {
      const [name, ...args] = body.split("|").map(part => part.trim());
      if (["lb", "lbl", "label", "q", "qualifier", "qual"].includes(name)) return "";
      if (["l", "m", "link", "mention"].includes(name) && args[0] === "en") return args[2] || args[1] || "";
      if (["ng", "non-gloss definition", "gl", "gloss"].includes(name)) return args[0] || "";
      if (name === "cap") return (args[0]?.[0]?.toUpperCase() ?? "") + (args[0]?.slice(1) ?? "");
      unsupported = true; return "";
    });
    if (unsupported) return null;
  }
  if (/\{\{|\}\}/.test(text)) return null;
  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_all, target: string, display?: string) => display ?? target.split("#")[0])
    .replace(/'{2,5}/g, "").replace(/<[^>]+>/g, "");
  text = decodeEntities(text).trim().replace(/\s+/g, " ");
  if (!text || text.length > 600 || /\[|\]|\{|\}|https?:|@|\n/.test(text) || !isPublicReferenceSafe("", text)) return null;
  return text;
}

export function parseWiktionaryReference(input: string, payload: unknown): ReferenceEntry | null {
  if (!payload || typeof payload !== "object") return null;
  const parsed = (payload as { parse?: { title?: unknown; revid?: unknown; wikitext?: unknown } }).parse;
  const phrase = normalizePhrase(input);
  if (!parsed || typeof parsed.title !== "string" || normalizePhrase(parsed.title.replaceAll("_", " ")) !== phrase
    || typeof parsed.revid !== "number" || !Number.isSafeInteger(parsed.revid) || parsed.revid <= 0) return null;
  const raw = typeof parsed.wikitext === "string" ? parsed.wikitext
    : parsed.wikitext && typeof parsed.wikitext === "object" ? (parsed.wikitext as { "*"?: unknown })["*"] : null;
  if (typeof raw !== "string" || raw.length > MAX_REFERENCE_BYTES) return null;
  // Other languages, pronunciation labels, category labels and quotations never
  // establish a Singapore English meaning. The qualifier must be on this sense.
  const activeText = raw.replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(nowiki|pre|code|ref)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(?:nowiki|pre|code|ref)\b[^>]*\/\s*>/gi, "");
  if (/<!--|<(?:nowiki|pre|code|ref)\b/i.test(activeText)) return null;
  const section = activeText.match(/^==\s*English\s*==\s*\n([\s\S]*?)(?=^==[^=]|$(?![\s\S]))/m)?.[1];
  if (!section) return null;
  for (const line of section.split("\n")) {
    if (!/^#\s+/.test(line)) continue;
    if (/<(?:nowiki|pre|code|ref)\b/i.test(line)) continue;
    const qualifier = line.match(/^#\s+\{\{(?:lb|lbl|label)\|en\|([^{}]+)\}\}/)?.[1];
    if (!qualifier || !qualifier.split("|").some(label => /^(?:Singapore|Singlish|Singapore English)$/i.test(label.trim()))) continue;
    if (qualifier.split("|").some(label => /(?:vulgar|offensive|derogatory|slur|taboo|sexual)/i.test(label))) continue;
    const meaning = definitionText(line.replace(/^#\s+/, ""));
    if (!meaning || !isPublicReferenceSafe(phrase, meaning)) continue;
    return {
      term: phrase, meaning, verified: true,
      source: "Wiktionary contributors · definition formatting adapted · CC BY-SA 4.0",
      sourceUrl: `https://en.wiktionary.org/w/index.php?title=${encodeURIComponent(parsed.title)}&oldid=${parsed.revid}#English`,
      revision: parsed.revid,
    };
  }
  return null;
}

async function boundedJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get("content-length") ?? 0) > MAX_REFERENCE_BYTES || !response.body) throw new Error("Reference size");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    length += next.value.byteLength;
    if (length > MAX_REFERENCE_BYTES) { await reader.cancel(); throw new Error("Reference size"); }
    chunks.push(next.value);
  }
  const data = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(data));
}

export async function fetchWiktionaryReference(phrase: string, config: { fetcher?: typeof fetch; timeoutMs?: number } = {}): Promise<ReferenceResult> {
  const validated = validatePhrase(phrase);
  if ("error" in validated) return { status: "missing" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 8_000);
  try {
    const url = new URL("https://en.wiktionary.org/w/api.php");
    url.search = new URLSearchParams({ action: "parse", page: validated.phrase, prop: "wikitext|revid", format: "json", formatversion: "2", redirects: "1" }).toString();
    const response = await (config.fetcher ?? fetch)(url.toString(), {
      signal: controller.signal, redirect: "manual",
      headers: { "Accept": "application/json", "User-Agent": "SinglishLoom/1.0 (+https://singlish-loom-bc.activepearl4.chatgpt.site/about)" },
    });
    if (response.status === 404) return { status: "missing" };
    if (!response.ok) {
      console.warn("Singlish Loom dictionary HTTP unavailable:", response.status);
      return { status: "unavailable" };
    }
    const payload = await boundedJson(response);
    if (payload && typeof payload === "object" && "error" in payload) {
      return { status: (payload.error as { code?: string })?.code === "missingtitle" ? "missing" : "unavailable" };
    }
    const entry = parseWiktionaryReference(validated.phrase, payload);
    return entry ? { status: "ready", entry } : { status: "missing" };
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message.replace(/https?:\/\/\S+/g, "[dictionary URL]").slice(0, 160)}` : "error";
    console.warn("Singlish Loom dictionary network unavailable:", detail);
    return { status: "unavailable" };
  } finally { clearTimeout(timeout); }
}

export class D1ReferenceStore {
  constructor(private readonly db: D1Database) {}
  read(phrase: string) {
    return this.db.prepare(`SELECT ${REFERENCE_FIELDS} FROM phrase_references WHERE lookup_phrase = ?`).bind(phrase).first<ReferenceRow>();
  }
  async readVariant(phrase: string): Promise<ReferenceRow | null> {
    const rows = await this.db.prepare(`SELECT ${REFERENCE_FIELDS} FROM phrase_references WHERE compact_phrase = ? AND status = 'ready' LIMIT 2`)
      .bind(compactPhrase(phrase)).all<ReferenceRow>();
    return rows.results?.length === 1 ? rows.results[0] : null;
  }
  async spend(day: string): Promise<boolean> {
    const row = await this.db.prepare(`INSERT INTO reference_budgets (day, used) VALUES (?, 1)
      ON CONFLICT(day) DO UPDATE SET used = reference_budgets.used + 1
      WHERE reference_budgets.used < ? RETURNING used`).bind(day, REFERENCE_DAILY_LIMIT).first();
    return Boolean(row);
  }
  async claim(phrase: string, token: string, now: number) {
    const row = await this.db.prepare(`
      INSERT INTO phrase_references (lookup_phrase, compact_phrase, status, checked_at, retry_after, lease_token, lease_until)
      VALUES (?, ?, 'pending', ?, 0, ?, ?)
      ON CONFLICT(lookup_phrase) DO UPDATE SET status = 'pending', checked_at = excluded.checked_at,
        retry_after = 0, lease_token = excluded.lease_token, lease_until = excluded.lease_until
      WHERE (phrase_references.status IN ('missing', 'unavailable') AND phrase_references.retry_after <= ?)
        OR (phrase_references.status = 'pending' AND phrase_references.lease_until <= ?)
      RETURNING lookup_phrase
    `).bind(phrase, compactPhrase(phrase), now, token, now + 15_000, now, now).first();
    return Boolean(row);
  }
  async finish(phrase: string, token: string, result: ReferenceResult, now: number) {
    const entry = result.status === "ready" ? result.entry : null;
    await this.db.prepare(`UPDATE phrase_references SET status = ?, phrase = ?, meaning = ?, source = ?, source_url = ?,
      revision = ?, checked_at = ?, retry_after = ?, lease_token = NULL, lease_until = 0
      WHERE lookup_phrase = ? AND status = 'pending' AND lease_token = ?`)
      .bind(result.status, entry?.term ?? null, entry?.meaning ?? null, entry?.source ?? null, entry?.sourceUrl ?? null,
        entry?.revision ?? null, now, result.status === "missing" ? now + 15 * 60_000 : result.status === "unavailable" ? now + 60_000 : 0, phrase, token).run();
  }
}

function fromRow(row: ReferenceRow | null): ReferenceEntry | null {
  if (row?.status !== "ready" || !row.phrase || !row.meaning || !row.source || !row.sourceUrl || !row.revision) return null;
  if (!isPublicReferenceSafe(row.phrase, row.meaning)) return null;
  return { term: row.phrase, meaning: row.meaning, verified: true, source: row.source, sourceUrl: row.sourceUrl, revision: row.revision };
}

export async function resolveLiveReference(phrase: string, config: { db?: D1Database; fetcher?: typeof fetch; timeoutMs?: number; now?: () => number }): Promise<ReferenceResult> {
  if (!config.db) return { status: "missing" };
  const normalized = normalizePhrase(phrase), now = config.now ?? Date.now;
  const store = new D1ReferenceStore(config.db), token = crypto.randomUUID();
  try {
    const row = await store.read(normalized), cached = fromRow(row) ?? fromRow(await store.readVariant(normalized));
    if (cached) return { status: "ready", entry: cached };
    if (row && row.retryAfter > now()) return { status: row.status === "missing" ? "missing" : "unavailable" };
    if (!await store.claim(normalized, token, now())) return { status: "unavailable" };
    const day = new Date(now() + 8 * 60 * 60_000).toISOString().slice(0, 10);
    if (!await store.spend(day)) {
      await store.finish(normalized, token, { status: "unavailable" }, now());
      return { status: "unavailable" };
    }
    const result = await fetchWiktionaryReference(normalized, config);
    await store.finish(normalized, token, result, now());
    // Read the winning persisted definition; concurrent callers cannot replace it.
    const saved = fromRow(await store.read(normalized));
    return saved ? { status: "ready", entry: saved } : result.status === "ready" ? { status: "unavailable" } : result;
  } catch { return { status: "unavailable" }; }
}
