import { compactPhrase, isBlockedPhrase, normalizePhrase, validatePhrase } from "./corpus";
import { isClearSpellingVariant, isNearPhrase, phraseDistance } from "./phrase-variants";
import type { CorpusTerm } from "./types";

export const REFERENCE_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
const MAX_REFERENCE_BYTES = 512 * 1024;
export const REFERENCE_DAILY_LIMIT = 3000;
const REFERENCE_FIELDS = "lookup_phrase AS lookupPhrase, status, phrase, meaning, source, source_url AS sourceUrl, revision, checked_at AS checkedAt, retry_after AS retryAfter, lease_token AS leaseToken, lease_until AS leaseUntil";

export interface ReferenceEntry extends CorpusTerm { revision: number }
export type ReferenceResult = { status: "ready"; entry: ReferenceEntry } | { status: "choices"; entries: ReferenceEntry[] } | { status: "missing" | "unavailable" };
export interface ReferenceConfig {
  db?: D1Database; fetcher?: typeof fetch; timeoutMs?: number; now?: () => number;
  // The durable daily budget is charged for each HTTP call, including search.
  spendRequest?: () => Promise<boolean>;
}
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
  if (phrase.includes(":")) return null; // Namespace/user pages cannot establish a dictionary entry.
  if (!parsed || typeof parsed.title !== "string" || parsed.title.includes(":") || normalizePhrase(parsed.title.replaceAll("_", " ")) !== phrase
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

async function boundedJson(response: Response, signal?: AbortSignal): Promise<unknown> {
  if (Number(response.headers.get("content-length") ?? 0) > MAX_REFERENCE_BYTES || !response.body) throw new Error("Reference size");
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      if (signal?.aborted) throw new Error("Reference timed out");
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > MAX_REFERENCE_BYTES) { await reader.cancel(); throw new Error("Reference size"); }
      chunks.push(next.value);
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
  const data = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(data));
}

function rankReferenceCandidates(input: string, entries: ReferenceEntry[]): ReferenceResult {
  const unique = [...new Map(entries.map(entry => [entry.term, entry])).values()]
    .filter(entry => isNearPhrase(input, entry.term))
    .sort((a, b) => phraseDistance(compactPhrase(input), compactPhrase(a.term)) - phraseDistance(compactPhrase(input), compactPhrase(b.term)) || a.term.localeCompare(b.term));
  if (!unique.length) return { status: "missing" };
  if (unique.length === 1 && isClearSpellingVariant(input, unique[0].term)) return { status: "ready", entry: unique[0] };
  return { status: "choices", entries: unique };
}

/** Only MediaWiki's own normalized/redirect chain can authorize a parse title
 * differing from the requested page. A returned title by itself is not proof. */
export function confirmsWiktionaryRedirect(input: string, title: string, payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const query = (payload as { query?: { normalized?: unknown; redirects?: unknown; pages?: unknown } }).query;
  if (!query || !Array.isArray(query.pages)) return false;
  const target = normalizePhrase(title.replaceAll("_", " "));
  const page = query.pages.find(page => page && typeof page === "object" && typeof page.title === "string"
    && normalizePhrase(page.title.replaceAll("_", " ")) === target && page.ns === 0 && page.pageid > 0 && !("missing" in page));
  if (!page) return false;
  const links = [...(Array.isArray(query.normalized) ? query.normalized : []), ...(Array.isArray(query.redirects) ? query.redirects : [])];
  let current = normalizePhrase(input), redirected = false;
  const seen = new Set<string>();
  for (let step = 0; step < 8 && !seen.has(current); step++) {
    if (current === target) return redirected;
    seen.add(current);
    const link = links.find(link => link && typeof link === "object" && typeof link.from === "string" && typeof link.to === "string"
      && normalizePhrase(link.from.replaceAll("_", " ")) === current && !("tointerwiki" in link)
      && normalizePhrase(link.to.replaceAll("_", " ")) !== current
      && (!("tofragment" in link) || link.tofragment === "English"));
    if (!link) return false;
    current = normalizePhrase(link.to.replaceAll("_", " ")); redirected = true;
  }
  return false;
}

export async function fetchWiktionaryReference(phrase: string, config: ReferenceConfig = {}): Promise<ReferenceResult> {
  const validated = validatePhrase(phrase);
  if ("error" in validated) return { status: "missing" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 8_000);
  try {
    let requests = 0;
    async function request(params: Record<string, string>): Promise<unknown> {
      if (++requests > 18 || controller.signal.aborted || config.spendRequest && !await config.spendRequest()) throw new Error("Reference request allowance");
      const url = new URL("https://en.wiktionary.org/w/api.php");
      url.search = new URLSearchParams({ ...params, format: "json", formatversion: "2" }).toString();
      const response = await (config.fetcher ?? fetch)(url.toString(), {
        signal: controller.signal, redirect: "manual",
        headers: { "Accept": "application/json", "User-Agent": "SinglishLoom/1.0 (+https://singlish-loom.vercel.app/about)" },
      });
      if (response.status === 404) return { error: { code: "missingtitle" } };
      if (!response.ok) throw new Error(`Dictionary HTTP ${response.status}`);
      return boundedJson(response, controller.signal);
    }
    async function page(title: string): Promise<ReferenceEntry | null> {
      if (title.includes(":")) return null;
      const payload = await request({ action: "parse", page: title, prop: "wikitext|revid", redirects: "1" });
      if (!payload || typeof payload !== "object") throw new Error("Dictionary payload");
      if ("error" in payload) {
        if ((payload.error as { code?: string })?.code === "missingtitle") return null;
        throw new Error("Dictionary parse error");
      }
      const parsed = (payload as { parse?: { title?: unknown } }).parse;
      if (!parsed || typeof parsed.title !== "string") throw new Error("Dictionary parse missing");
      const canonical = normalizePhrase(parsed.title.replaceAll("_", " "));
      if (canonical === normalizePhrase(title)) return parseWiktionaryReference(title, payload);
      if ("error" in validatePhrase(canonical)) return null;
      const mapping = await request({ action: "query", titles: title, redirects: "1", prop: "info" });
      return confirmsWiktionaryRedirect(title, canonical, mapping) ? parseWiktionaryReference(canonical, payload) : null;
    }
    const exact = await page(validated.phrase);
    if (exact) return { status: "ready", entry: exact };
    // Fuzzy title search only finds candidates. Each candidate must independently
    // carry a public-safe Singapore/Singlish qualifier on an English definition.
    const search = await request({ action: "query", list: "prefixsearch", pssearch: validated.phrase, psprofile: "fuzzy", psnamespace: "0", pslimit: "8" });
    const hits = search && typeof search === "object" ? (search as { query?: { prefixsearch?: unknown } }).query?.prefixsearch : null;
    if (!Array.isArray(hits)) throw new Error("Dictionary search payload");
    const titles = [...new Set(hits.slice(0, 8).flatMap(hit => hit && typeof hit === "object" && hit.ns === 0 && typeof hit.title === "string"
      && !("error" in validatePhrase(hit.title)) && isNearPhrase(validated.phrase, hit.title)
      ? [normalizePhrase(hit.title.replaceAll("_", " "))] : []))];
    const entries: ReferenceEntry[] = [];
    for (const title of titles) {
      if (title === validated.phrase) continue; // Already checked this sense.
      const candidate = await page(title);
      if (candidate) entries.push(candidate);
    }
    return rankReferenceCandidates(validated.phrase, entries);
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
    const rows = await this.db.prepare(`SELECT ${REFERENCE_FIELDS} FROM phrase_references WHERE compact_phrase = ? AND status = 'ready' GROUP BY phrase, meaning, source_url LIMIT 2`)
      .bind(compactPhrase(phrase)).all<ReferenceRow>();
    return rows.results?.length === 1 ? rows.results[0] : null;
  }
  async readNear(phrase: string): Promise<ReferenceEntry[]> {
    const length = compactPhrase(phrase).length;
    const rows = await this.db.prepare(`SELECT ${REFERENCE_FIELDS} FROM phrase_references WHERE status = 'ready' AND length(compact_phrase) BETWEEN ? AND ? ORDER BY checked_at DESC LIMIT 501`)
      .bind(Math.max(0, length - 2), length + 2).all<ReferenceRow>();
    // Never treat a truncated candidate set as evidence that no match exists.
    if ((rows.results?.length ?? 0) > 500) throw new Error("Reference candidates truncated");
    return (rows.results ?? []).flatMap(row => { const entry = fromRow(row); return entry && isNearPhrase(phrase, entry.term) ? [entry] : []; });
  }
  async spend(day: string): Promise<boolean> {
    const row = await this.db.prepare(`INSERT INTO reference_budgets (day, used) VALUES (?, 1)
      ON CONFLICT(day) DO UPDATE SET used = reference_budgets.used + 1
      WHERE reference_budgets.used < ? RETURNING used`).bind(day, REFERENCE_DAILY_LIMIT).first();
    return Boolean(row);
  }
  async claim(phrase: string, token: string, now: number, compactInput = phrase) {
    const row = await this.db.prepare(`
      INSERT INTO phrase_references (lookup_phrase, compact_phrase, status, checked_at, retry_after, lease_token, lease_until)
      VALUES (?, ?, 'pending', ?, 0, ?, ?)
      ON CONFLICT(lookup_phrase) DO UPDATE SET status = 'pending', checked_at = excluded.checked_at,
        retry_after = 0, lease_token = excluded.lease_token, lease_until = excluded.lease_until
      WHERE (phrase_references.status IN ('missing', 'unavailable') AND phrase_references.retry_after <= ?)
        OR (phrase_references.status = 'pending' AND phrase_references.lease_until <= ?)
      RETURNING lookup_phrase
    `).bind(phrase, compactPhrase(compactInput), now, token, now + 15_000, now, now).first();
    return Boolean(row);
  }
  async finish(phrase: string, token: string, result: Exclude<ReferenceResult, { status: "choices" }>, now: number) {
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

export async function resolveLiveReference(phrase: string, config: ReferenceConfig): Promise<ReferenceResult> {
  if (!config.db) return { status: "unavailable" };
  const normalized = normalizePhrase(phrase), now = config.now ?? Date.now;
  // v2 performs a broader title search. Old exact-only misses are not evidence
  // that this new policy searched similar spellings; ready citations remain usable.
  const lookupKey = `v2:${normalized}`;
  const store = new D1ReferenceStore(config.db), token = crypto.randomUUID();
  try {
    const row = await store.read(lookupKey), cached = fromRow(row) ?? fromRow(await store.read(normalized)) ?? fromRow(await store.readVariant(normalized));
    if (cached) return { status: "ready", entry: cached };
    if (row && row.retryAfter > now()) return row.status === "missing" ? rankReferenceCandidates(normalized, await store.readNear(normalized)) : { status: "unavailable" };
    if (!await store.claim(lookupKey, token, now(), normalized)) return { status: "unavailable" };
    const day = new Date(now() + 8 * 60 * 60_000).toISOString().slice(0, 10);
    const result = await fetchWiktionaryReference(normalized, { ...config, spendRequest: () => store.spend(day) });
    if (result.status === "choices") {
      // Store each checked meaning under its own title, never label the visitor's
      // ambiguous text with one candidate's definition. The negative query cache
      // reconstructs these supported choices without repeating paid HTTP work.
      const persisted: ReferenceEntry[] = [];
      for (const entry of result.entries) {
        const key = `v2:${entry.term}`, candidateToken = crypto.randomUUID();
        if (await store.claim(key, candidateToken, now(), entry.term)) await store.finish(key, candidateToken, { status: "ready", entry }, now());
        const saved = fromRow(await store.read(key));
        if (!saved || saved.term !== entry.term) {
          await store.finish(lookupKey, token, { status: "unavailable" }, now());
          return { status: "unavailable" };
        }
        persisted.push(saved);
      }
      await store.finish(lookupKey, token, { status: "missing" }, now());
      return { status: "choices", entries: persisted };
    }
    await store.finish(lookupKey, token, result, now());
    // Read the winning persisted definition; concurrent callers cannot replace it.
    const saved = fromRow(await store.read(lookupKey));
    return saved ? { status: "ready", entry: saved } : result.status === "ready" ? { status: "unavailable" } : result;
  } catch { return { status: "unavailable" }; }
}
