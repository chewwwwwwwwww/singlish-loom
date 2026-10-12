import { CORPUS, compactPhrase, normalizePhrase } from "./corpus";
import { DICTIONARY, resolveSupportedTerm } from "./dictionary";
import type { CorpusTerm } from "./types";

export interface PhraseVariant {
  entry: CorpusTerm;
  resolution: "exact" | "variant" | "spelling";
}

export function phraseDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + Number(a[i - 1] !== b[j - 1]));
      diagonal = previous;
    }
  }
  return row[b.length];
}

/** Only named aliases and a uniquely closest small typo authorize a correction.
 * Particles are not removed globally: "can ah" can differ from "can lah". */
export function resolvePhraseVariant(phrase: string): PhraseVariant | null {
  const normalized = normalizePhrase(phrase);
  const exact = resolveSupportedTerm(normalized);
  if (exact) return { entry: exact, resolution: normalized === normalizePhrase(exact.term) ? "exact" : "variant" };
  const input = compactPhrase(normalized);
  // Short expressions are too easy to confuse with a different valid word.
  if (input.length < 7) return null;
  const threshold = input.length >= 16 ? 2 : 1;
  const candidates = [...CORPUS, ...DICTIONARY].map(entry => ({
    entry,
    edits: Math.min(...[entry.term, ...(entry.aliases ?? [])].map(alias => {
      const candidate = compactPhrase(alias);
      return candidate.length >= 5 ? phraseDistance(input, candidate) : Infinity;
    })),
  })).filter(candidate => candidate.edits <= threshold).sort((a, b) => a.edits - b.edits);
  if (!candidates.length || candidates[0].edits === candidates[1]?.edits) return null;
  return { entry: candidates[0].entry, resolution: "spelling" };
}

/** Candidate discovery is wider than automatic correction. Similar spelling
 * offers a choice; it does not establish that two phrases have one meaning. */
export function isNearPhrase(input: string, candidate: string): boolean {
  const a = compactPhrase(input), b = compactPhrase(candidate);
  const threshold = a.length >= 5 ? 2 : a.length >= 4 ? 1 : 0;
  return Math.abs(a.length - b.length) <= threshold && phraseDistance(a, b) <= threshold;
}

export function isClearSpellingVariant(input: string, candidate: string): boolean {
  const a = compactPhrase(input), b = compactPhrase(candidate);
  return a === b || (a.length >= 7 && phraseDistance(a, b) <= (a.length >= 16 ? 2 : 1));
}

/** Spelling normalization is kept separate from evidence of a meaning. */
export function canonicalCreativePhrase(phrase: string): string {
  const normalized = normalizePhrase(phrase);
  const known = resolveSupportedTerm(normalized);
  if (known) return known.term;
  return normalized.replace(/\bla$/, "lah");
}
