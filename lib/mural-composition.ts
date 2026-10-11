import { compactPhrase, normalizePhrase } from "./corpus";
import { resolveSupportedTerm } from "./dictionary";
import { canonicalCreativePhrase, resolvePhraseVariant } from "./phrase-variants";
import type { LoomArtwork, MuralContribution, MuralResponse } from "./types";

export type MuralZone = "table" | "counter" | "conversation" | "street";

export const MURAL_ZONES: { id: MuralZone; label: string; caption: string }[] = [
  { id: "table", label: "At the tables", caption: "A seat saved, a kopi shared, a moment to lepak." },
  { id: "counter", label: "Breakfast rush", caption: "Orders, small mishaps and everyday determination." },
  { id: "conversation", label: "Coffee talk", caption: "The things we say across the table." },
  { id: "street", label: "Five-foot way", caption: "A little neighbourhood life beyond the shop." },
];

export interface MuralPatch {
  key: string;
  phrase: string;
  count: number;
  contributionIds: string[];
  firstCreatedAt: number;
  lastCreatedAt: number;
  firstId: string;
  latestId: string;
  artwork: LoomArtwork | null;
  meaning: string;
  verified: boolean;
  source: string | null;
  sourceUrl: string | null;
  palette: number;
  zone: MuralZone;
}

// These are editorial places in the scene, not etymological or dictionary
// claims. The existing art metaphor informs each neighbourhood placement.
const PHRASE_ZONES: Record<string, MuralZone> = {
  "blur sotong": "table",
  "kanchiong spider": "counter",
  "stun like vegetable": "counter",
  "pattern more than badminton": "conversation",
  "my grandma run faster than you": "street",
  "your grandfather road issit": "street",
  "steady pom pi pi": "counter",
  "double confirm": "counter",
  "confirm plus chop": "counter",
  "chop chop curry pok": "counter",
  chope: "table",
  gostun: "street",
  "can is can": "conversation",
  "win liao lor": "conversation",
  "go fly kite": "street",
  "wake up your idea": "counter",
  "one time good one": "counter",
  "i.e. to say": "conversation",
  "you think i thought who confirm": "conversation",
  "die die must": "street",
  shiok: "table",
  "sorry, no cure": "counter",
  "last touch": "counter",
  chim: "conversation",
  atas: "table",
  orhor: "conversation",
  aiyo: "conversation",
  paiseh: "conversation",
  kiasu: "counter",
  sian: "table",
  "bo jio": "table",
  jialat: "counter",
  lah: "conversation",
  lor: "conversation",
  leh: "conversation",
  makan: "table",
  tapau: "counter",
  alamak: "counter",
  "bo pian": "conversation",
  "catch no ball": "conversation",
  kopitiam: "table",
  kena: "conversation",
  lepak: "table",
  sabo: "conversation",
  "heng ah": "conversation",
};

function compareContributions(a: MuralContribution, b: MuralContribution): number {
  return a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function zoneFor(phrase: string, meaning: string): MuralZone {
  const curated = PHRASE_ZONES[normalizePhrase(phrase)] ?? PHRASE_ZONES[phrase];
  if (curated) return curated;
  const context = `${phrase} ${meaning}`.toLowerCase();
  if (/\b(?:food|eat|meal|delicious|drink|coffee|tea|relax|rest|loiter|seat|reserve|enjoy|pleasure)\b/.test(context)) return "table";
  if (/\b(?:rush|hurry|busy|order|work|quick|takeaway|pack|finish|check|confirm|nervous|panick?y?)\b/.test(context)) return "counter";
  if (/\b(?:road|street|walk|run|move|reverse|backwards|away|kite|bus|travel)\b/.test(context)) return "street";
  return "conversation";
}

function referenceIdentity(record: MuralContribution): string {
  // Merely sharing an unspaced spelling is insufficient: two distinct
  // dictionary entries can differ only by word boundaries.
  return JSON.stringify([record.meaning, record.source, record.sourceUrl]);
}

export function groupMuralContributions(records: readonly MuralContribution[]): MuralPatch[] {
  const sorted = [...records].sort(compareContributions);
  const seenIds = new Set<string>();
  const unique = sorted.filter((record) => {
    if (seenIds.has(record.id)) return false;
    seenIds.add(record.id);
    return true;
  });
  const discovered = new Map<string, { first: MuralContribution; identities: Set<string> }>();
  for (const record of unique) {
    if (resolveSupportedTerm(record.phrase)) continue;
    const compact = compactPhrase(record.phrase);
    const variants = discovered.get(compact) ?? { first: record, identities: new Set<string>() };
    variants.identities.add(referenceIdentity(record));
    discovered.set(compact, variants);
  }

  const groups = new Map<string, MuralContribution[]>();
  for (const record of unique) {
    const known = resolvePhraseVariant(record.phrase)?.entry;
    const variants = discovered.get(compactPhrase(record.phrase));
    // Stable choice: the first existing accepted phrase owns the patch name.
    // Discovered variants merge only with one consistent source definition.
    const unambiguous = variants && variants.identities.size === 1;
    const canonical = known?.term ?? canonicalCreativePhrase(unambiguous ? variants.first.phrase : record.phrase);
    const group = groups.get(canonical) ?? [];
    group.push(record);
    groups.set(canonical, group);
  }

  return [...groups].map(([phrase, group]) => {
    const first = group[0];
    const latest = group[group.length - 1];
    // Never replace an illustration because somebody chose its phrase again.
    // A newer unavailable snapshot cannot erase an older visitor's artwork.
    const art = group.find((record) => record.artwork !== null)?.artwork ?? null;
    return {
      key: phrase, phrase, count: group.length, contributionIds: group.map((record) => record.id),
      firstCreatedAt: first.createdAt, lastCreatedAt: latest.createdAt, firstId: first.id, latestId: latest.id,
      artwork: art, meaning: first.meaning, verified: first.verified,
      source: first.source, sourceUrl: first.sourceUrl, palette: first.palette,
      zone: zoneFor(phrase, first.meaning),
    };
  });
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
}

function safeSourceUrl(value: unknown): value is string | null {
  if (value === null) return true;
  if (!text(value, 1, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

export function isSafeMuralArtworkUrl(value: unknown): value is string {
  // Only our versioned assets and content-addressed image endpoint belong in
  // the mural. Relative allowlisted routes rule out external tracking URLs,
  // script/data URLs, encoded traversal and scheme-relative hostnames.
  return typeof value === "string" && (
    /^\/artworks\/[a-z0-9][a-z0-9_-]*\.(?:jpg|jpeg|png|webp)$/.test(value)
    || /^\/api\/artwork\?id=[a-f0-9]{64}$/.test(value)
  );
}

function isArtwork(value: unknown): value is LoomArtwork | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const artwork = value as Partial<LoomArtwork>;
  return isSafeMuralArtworkUrl(artwork.url) && text(artwork.alt, 1, 4096)
    && (artwork.provider === "studio" || artwork.provider === "gemini") && typeof artwork.cached === "boolean";
}

export function isMuralResponse(value: unknown): value is MuralResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<MuralResponse>;
  return Array.isArray(data.records) && Number.isSafeInteger(data.total) && (data.total ?? -1) >= 0
    && data.records.length === data.total
    && data.records.every((record) => record && text(record.id, 1, 120) && text(record.phrase, 2, 120)
      && text(record.meaning, 1, 16000) && typeof record.verified === "boolean"
      && (record.source === null || text(record.source, 1, 4096)) && safeSourceUrl(record.sourceUrl)
      && Number.isSafeInteger(record.palette) && Number.isSafeInteger(record.createdAt) && record.createdAt >= 0
      && isArtwork(record.artwork))
    && new Set(data.records.map((record) => record.id)).size === data.records.length;
}
