import { matchCorpus, normalizePhrase, validatePhrase } from "./corpus";
import { resolveSupportedTerm, suggestSupportedTerms } from "./dictionary";
import { resolveLiveReference } from "./live-reference";
import { canonicalCreativePhrase, resolvePhraseVariant } from "./phrase-variants";
import type { CorpusTerm, PhraseCheckResponse, UnknownPhrase } from "./types";

export function checkSupportedPhrase(phrase: string): PhraseCheckResponse {
  const entry = resolveSupportedTerm(phrase);
  if (entry) return {
    accepted: true, phrase: entry.term, meaning: entry.meaning,
    verified: entry.verified, source: entry.source, sourceUrl: entry.sourceUrl,
    availability: matchCorpus(entry.term) ? "prepared" : "live",
    provenance: matchCorpus(entry.term) ? "collection" : "reviewed",
  };
  return {
    accepted: false, code: "UNKNOWN_PHRASE", phrase: normalizePhrase(phrase),
    error: "This phrase was not found in checked references. Check the spelling or choose a suggested phrase.",
    suggestions: suggestSupportedTerms(phrase).slice(0, 3).map((entry) => ({ phrase: entry.term, meaning: entry.meaning })),
  };
}

export async function checkPhrase(phrase: string, config: { db?: D1Database; fetcher?: typeof fetch; timeoutMs?: number } = {}): Promise<PhraseCheckResponse> {
  const validated = validatePhrase(phrase);
  if ("error" in validated) return {
    accepted: false, code: "UNKNOWN_PHRASE", phrase: normalizePhrase(phrase),
    error: validated.error, suggestions: [],
  };
  const submittedPhrase = validated.phrase;
  const variant = resolvePhraseVariant(submittedPhrase);
  if (variant) {
    const local = checkSupportedPhrase(variant.entry.term);
    if (local.accepted) return { ...local, submittedPhrase, resolution: variant.resolution };
  }
  const canonical = canonicalCreativePhrase(submittedPhrase);
  const local = checkSupportedPhrase(canonical);
  if (local.accepted) return { ...local, submittedPhrase, resolution: canonical === submittedPhrase ? "exact" : "variant" };
  const found = await resolveLiveReference(canonical, config);
  if (found.status === "ready") return {
    accepted: true, phrase: found.entry.term, meaning: found.entry.meaning,
    verified: found.entry.verified, source: found.entry.source, sourceUrl: found.entry.sourceUrl,
    availability: "live", provenance: "discovered",
    submittedPhrase, resolution: found.entry.term === submittedPhrase ? "exact" : "variant",
  };
  // A missing dictionary entry is an evidence label, not a ban on creativity.
  // Never promote this visitor interpretation into a verified definition.
  return {
    accepted: true, phrase: canonical,
    meaning: "No confirmed dictionary meaning is available. This artwork is a creative interpretation of the visitor’s phrase; its meaning depends on context.",
    verified: false, source: null, sourceUrl: null,
    availability: "live", provenance: "creative", submittedPhrase,
    resolution: "creative", referenceStatus: found.status === "unavailable" ? "unavailable" : "not_found",
    suggestions: local.suggestions,
  };
}

export async function requireCheckedTerm(phrase: string, config: { db?: D1Database; fetcher?: typeof fetch; timeoutMs?: number }): Promise<CorpusTerm> {
  const result = await checkPhrase(phrase, config);
  if (!result.accepted) throw new UnknownPhraseError(phrase, result);
  return { term: result.phrase, meaning: result.meaning, verified: result.verified, source: result.source, sourceUrl: result.sourceUrl, provenance: result.provenance };
}

export class UnknownPhraseError extends Error {
  readonly payload: UnknownPhrase;
  constructor(phrase: string, checked?: UnknownPhrase) {
    const result = checked ?? checkSupportedPhrase(phrase);
    const payload: UnknownPhrase = result.accepted ? {
      accepted: false, code: "UNKNOWN_PHRASE", phrase: normalizePhrase(phrase),
      error: "This phrase could not be checked. Choose a phrase from the collection.", suggestions: [],
    } : result;
    super(payload.error);
    this.name = "UnknownPhraseError";
    this.payload = payload;
  }
}

export function requireSupportedTerm(phrase: string): CorpusTerm {
  const validated = validatePhrase(phrase);
  const entry = "phrase" in validated ? resolveSupportedTerm(validated.phrase) : null;
  if (!entry) throw new UnknownPhraseError(phrase);
  return entry;
}
