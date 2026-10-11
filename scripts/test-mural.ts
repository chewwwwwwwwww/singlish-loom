import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { CORPUS } from "../lib/corpus";
import { DICTIONARY } from "../lib/dictionary";
import { groupMuralContributions, isMuralResponse, isSafeMuralArtworkUrl, MURAL_ZONES } from "../lib/mural-composition";
import { STUDIO_ART } from "../lib/studio-art";
import type { MuralContribution, MuralResponse } from "../lib/types";

let checks = 0;
function test(name: string, run: () => void) { run(); checks++; console.log(`✓ ${name}`); }
function record(phrase: string, index: number, overrides: Partial<MuralContribution> = {}): MuralContribution {
  const corpus = CORPUS.find((entry) => entry.term === phrase);
  const studio = STUDIO_ART[phrase];
  return {
    id: `saved-submission-${index}`, phrase, createdAt: 1000 + index, palette: index % 6,
    meaning: corpus?.meaning ?? "An expression used in Singapore English.", verified: corpus?.verified ?? false,
    source: corpus?.source ?? null, sourceUrl: corpus?.sourceUrl ?? null,
    artwork: studio ? { ...studio, provider: "studio", cached: true } : null,
    ...overrides,
  };
}
const records = Array.from({ length: 160 }, (_, index) => record(CORPUS[index % CORPUS.length].term, index));

test("all 160 real submissions count, including beyond the former 120-card cap", () => {
  const patches = groupMuralContributions(records);
  assert.equal(patches.reduce((sum, patch) => sum + patch.count, 0), 160);
  assert.equal(new Set(patches.flatMap((patch) => patch.contributionIds)).size, 160);
  assert.equal(patches.length, 27);
  assert.deepEqual(groupMuralContributions([]), [], "an empty mural has no fabricated contributions");
});

test("canonical aliases and spacing variants share one illustration and patch", () => {
  const first = record("kanchiong spider", 0);
  const aliases = ["kan chiong spider", "kan-chiong spider", "kanchiongspider", "kan cheong spider", "kancheong spider"];
  const patches = groupMuralContributions([first, ...aliases.map((phrase, index) => record(phrase, index + 1))]);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].key, "kanchiong spider");
  assert.equal(patches[0].count, 6);
  assert.deepEqual(patches[0].artwork, first.artwork);
  assert.equal(patches[0].zone, "counter");
});

test("discovered spacing merges only when one reference definition supports it", () => {
  const fixed = { meaning: "Relax or loiter casually.", source: "Wiktionary contributors", sourceUrl: "https://en.wiktionary.org/w/index.php?title=lepak&oldid=85845569#English" };
  const patches = groupMuralContributions([record("lepak", 0, fixed), record("le-pak", 1, fixed), record("le pak", 2, fixed)]);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].phrase, "lepak");
  assert.equal(patches[0].zone, "table");
  assert.equal(patches[0].count, 3);
  const ambiguous = groupMuralContributions([record("a bc", 0, { meaning: "One reference entry." }), record("ab c", 1, { meaning: "Another reference entry." }), record("a bc", 2, { meaning: "One reference entry." })]);
  assert.equal(ambiguous.length, 2, "ambiguous word boundaries must not merge meanings");
  assert.deepEqual(ambiguous.map((patch) => [patch.phrase, patch.count]), [["a bc", 2], ["ab c", 1]]);
});

test("repeated contributions add counts and IDs without replacing frozen artwork", () => {
  const first = record("chope", 0);
  const different = record("chope", 1, { artwork: { url: `/api/artwork?id=${"a".repeat(64)}`, alt: "A second image", provider: "gemini", cached: true } });
  const unavailable = record("chope", 2, { artwork: null });
  const patch = groupMuralContributions([unavailable, different, first])[0];
  assert.equal(patch.count, 3);
  assert.deepEqual(patch.artwork, first.artwork);
  assert.deepEqual(patch.contributionIds, [first.id, different.id, unavailable.id]);
  assert.equal(patch.firstId, first.id);
  assert.equal(patch.latestId, unavailable.id);
  assert.equal(patch.lastCreatedAt, unavailable.createdAt);
  assert.deepEqual(groupMuralContributions([record("lepak", 0), record("lepak", 1, { artwork: different.artwork })])[0].artwork, different.artwork, "the earliest available art survives a missing old snapshot");
  assert.equal(groupMuralContributions([record("chope", 0, { artwork: null })])[0].artwork, null, "explicit unavailable remains honest, even for a prepared term");
});

test("chronological composition is deterministic, order-independent and stable on append", () => {
  const patches = groupMuralContributions(records);
  assert.deepEqual(groupMuralContributions([...records].reverse()), patches);
  assert.deepEqual(groupMuralContributions(records), patches);
  const existing = groupMuralContributions(records.slice(0, 5));
  const added = groupMuralContributions([...records.slice(0, 5), record("chope", 170)]);
  assert.deepEqual(added.slice(0, 5), existing);
  const repeat = groupMuralContributions([...records.slice(0, 5), record("blur sotong", 171)]);
  assert.deepEqual(repeat.slice(1), existing.slice(1));
  assert.deepEqual(repeat[0].artwork, existing[0].artwork);
  assert.equal(repeat[0].key, existing[0].key);
  assert.equal(repeat[0].count, existing[0].count + 1);
  const ties = [record("chope", 2, { createdAt: 1 }), record("shiok", 1, { createdAt: 1 })];
  assert.deepEqual(groupMuralContributions(ties).map((patch) => patch.firstId), ["saved-submission-1", "saved-submission-2"]);
  assert.equal(groupMuralContributions([records[0], records[0]]).reduce((sum, patch) => sum + patch.count, 0), 1);
});

test("every prepared and reviewed expression receives a neighbourhood place", () => {
  const all = [...CORPUS, ...DICTIONARY, ...["lepak", "sabo", "heng ah"].map((term) => ({ term }))];
  const zones = new Set(MURAL_ZONES.map((zone) => zone.id));
  for (const [index, entry] of all.entries()) assert.ok(zones.has(groupMuralContributions([record(entry.term, index)])[0].zone));
  assert.equal(groupMuralContributions([record("new food expression", 0, { meaning: "A delicious meal." })])[0].zone, "table");
  assert.equal(groupMuralContributions([record("new rushing expression", 0, { meaning: "Hurry to finish work." })])[0].zone, "counter");
  assert.equal(groupMuralContributions([record("new moving expression", 0, { meaning: "Move backwards along a street." })])[0].zone, "street");
  assert.equal(groupMuralContributions([record("new conversation expression", 0)])[0].zone, "conversation");
});

test("only complete valid feeds and safe local artwork routes are accepted", () => {
  assert.ok(isMuralResponse({ records, total: 160 }));
  assert.ok(isMuralResponse({ records: [], total: 0 }));
  assert.ok(!isMuralResponse({ records, total: 161 }));
  assert.ok(!isMuralResponse({ records: [records[0], records[0]], total: 2 }));
  const malformed: Partial<MuralContribution>[] = [
    { palette: NaN }, { createdAt: Infinity }, { createdAt: -1 }, { verified: undefined },
    { phrase: "" }, { meaning: "" }, { source: undefined }, { sourceUrl: "javascript:alert(1)" },
    { artwork: undefined }, { artwork: { ...records[0].artwork!, cached: undefined } as unknown as MuralContribution["artwork"] },
  ];
  for (const fields of malformed) assert.ok(!isMuralResponse({ records: [{ ...records[0], ...fields }], total: 1 }), JSON.stringify(fields));
  for (const url of ["https://example.com/image.jpg", "//example.com/image.jpg", "data:image/png;base64,a", "javascript:alert(1)", "/artworks/../secret.jpg", "/artworks/%2e%2e/secret.jpg", `/api/artwork?id=${"a".repeat(64)}&other=1`, `/api/artwork?id=${"a".repeat(63)}`, "/artworks/anything.svg"]) {
    assert.ok(!isSafeMuralArtworkUrl(url), url);
    assert.ok(!isMuralResponse({ records: [{ ...records[0], artwork: { ...records[0].artwork, url } }], total: 1 }), url);
  }
  assert.ok(isSafeMuralArtworkUrl(`/api/artwork?id=${"0".repeat(64)}`));
  assert.ok(isSafeMuralArtworkUrl("/artworks/kanchiong-spider-woven-v1.jpg"));
  assert.ok(isMuralResponse({ records: [record("lepak", 0, { artwork: null })], total: 1 }));
});

// Exercise the real route and decoration against a migrated database, with
// network disabled: a mural read cannot accidentally spend generation budget.
const sqlite = new DatabaseSync(":memory:");
const migrationDir = new URL("../drizzle/", import.meta.url);
const archiveMigration = "0003_round_millenium_guard.sql";
for (const file of readdirSync(migrationDir).filter((entry) => entry.endsWith(".sql") && entry !== archiveMigration).sort()) sqlite.exec(readFileSync(new URL(file, migrationDir), "utf8"));
const archivedIds = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
const activeId = "00000000-0000-4000-8000-000000000003";
const historic = sqlite.prepare("INSERT INTO threads (id,request_id,phrase,meaning,myth,voice,voice_mode,verified,created_at,palette,mode) VALUES (?,?,?,'A historic draft.','An invented tale.','A short story.','story',0,100,0,'demo')");
historic.run(archivedIds[0], "historic-typo-1", "blur sotng");
historic.run(archivedIds[1], "historic-typo-2", " BLUR SOTNG ");
historic.run(activeId, "historic-correct", "blur sotong");
sqlite.exec(readFileSync(new URL(archiveMigration, migrationDir), "utf8"));
const runtime: Record<string, unknown> = {
  DB: { prepare: (query: string) => ({ bind: (...values: (string | number | null)[]) => ({
    first: async () => sqlite.prepare(query).get(...values) ?? null,
    run: async () => sqlite.prepare(query).run(...values),
    all: async () => ({ results: sqlite.prepare(query).all(...values) }),
    raw: async () => sqlite.prepare(query).all(...values).map((row) => Object.values(row)),
  }) }) },
  BUCKET: { get: async () => null }, GEMINI_API_KEY: "test-only-not-a-real-key",
};
(globalThis as typeof globalThis & { __muralTestEnv: typeof runtime }).__muralTestEnv = runtime;
const hook = registerHooks({ resolve(specifier, context, nextResolve) {
  return specifier === "cloudflare:workers"
    ? { url: "data:text/javascript,export const env = globalThis.__muralTestEnv;", shortCircuit: true }
    : nextResolve(specifier, context);
} });
const originalFetch = globalThis.fetch;
let providerCalls = 0;
globalThis.fetch = async () => { providerCalls++; throw new Error("A mural read must not call a provider."); };
try {
  const insert = sqlite.prepare(`INSERT INTO threads (id,request_id,phrase,meaning,myth,voice,voice_mode,verified,source,source_url,created_at,palette,mode,artwork) VALUES (?,?,?,?,?,?,'story',?,?,?,?,?,'prepared',?)`);
  for (const item of [...records].reverse()) insert.run(item.id, `request-${item.id}`, item.phrase, item.meaning, "An invented tale.", "A short story.", item.verified ? 1 : 0, item.source, item.sourceUrl, item.createdAt, item.palette, item.id === records[1].id ? JSON.stringify({ unavailable: true }) : null);
  const dynamic = record("lepak", 160, { artwork: { url: `/api/artwork?id=${"b".repeat(64)}`, alt: "A quiet afternoon at the kopitiam", provider: "gemini", cached: false } });
  insert.run(dynamic.id, "request-dynamic", dynamic.phrase, dynamic.meaning, "An invented tale.", "A short story.", 0, null, null, dynamic.createdAt, dynamic.palette, JSON.stringify(dynamic.artwork));
  const { GET } = await import("../app/api/mural/route");
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json() as MuralResponse;
  assert.equal(payload.total, 162);
  assert.equal(payload.records.length, 162);
  assert.ok(isMuralResponse(payload));
  assert.deepEqual(payload.records.map((item) => item.id), [activeId, ...records.map((item) => item.id), dynamic.id], "the SQL feed is complete and chronological, with requested typos excluded");
  assert.deepEqual(Object.keys(payload.records[0]).sort(), ["id", "phrase", "meaning", "verified", "source", "sourceUrl", "createdAt", "palette", "artwork"].sort(), "private identifiers and creative writing stay out of the lightweight feed");
  assert.equal(payload.records[0].artwork?.provider, "studio", "legacy prepared art remains visible");
  assert.equal(payload.records.find((item) => item.id === records[1].id)?.artwork, null, "an unavailable saved snapshot is not silently replaced by prepared art");
  assert.deepEqual(payload.records.at(-1)?.artwork, { ...dynamic.artwork, cached: true }, "a saved live image remains fixed");
  assert.equal(providerCalls, 0);
  assert.equal(sqlite.prepare("SELECT count(*) AS total FROM artwork_budgets").get()?.total, 0);
  const { getWall, getTapestry, getThread } = await import("../app/api/_loom");
  const tapestry = await (await getTapestry()).json() as { total: number; records: { id: string }[] };
  const wall = await (await getWall()).json() as { total: number; records: { id: string }[] };
  assert.equal(tapestry.total, 162);
  assert.equal(wall.total, 162);
  assert.equal(wall.records.length, 120);
  assert.ok([payload, tapestry, wall].every((feed) => feed.records.every((item) => !archivedIds.includes(item.id))), "all public feeds exclude archived contributions");
  assert.equal(sqlite.prepare("SELECT count(*) AS total FROM threads").get()?.total, 164, "archiving never deletes saved records");
  for (const id of archivedIds) {
    assert.ok(Number(sqlite.prepare("SELECT archived_at FROM threads WHERE id = ?").get(id)?.archived_at) > 0);
    const direct = await getThread(new Request(`https://loom.example/api/thread?id=${id}`));
    assert.equal(direct.status, 200, "the old direct share link remains available");
    assert.equal((await direct.json() as { id: string }).id, id);
  }
  assert.equal(sqlite.prepare("SELECT archived_at FROM threads WHERE id = ?").get(activeId)?.archived_at, null, "correct blur sotong remains active");
  assert.equal(providerCalls, 0);
  delete runtime.DB;
  const paused = await GET();
  assert.equal(paused.status, 503, "a failed database read does not become an empty successful mural");
  checks++;
  console.log("✓ real mural endpoint preserves 162 active rows, frozen/legacy art, light fields and zero provider calls");
  checks++;
  console.log("✓ scoped reversible typo archival excludes all public counts and retains valid phrases and direct share links");
} finally {
  globalThis.fetch = originalFetch;
  hook.deregister();
  sqlite.close();
}

console.log(`\n${checks} mural checks passed.`);
