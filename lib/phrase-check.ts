import { matchCorpus, normalizePhrase, validatePhrase } from "./corpus";
import { resolveSupportedTerm, suggestSupportedTerms } from "./dictionary";
import { resolveLiveReference } from "./live-reference";
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
  const local = checkSupportedPhrase(phrase);
  if (local.accepted || local.suggestions.length) return local;
  const found = await resolveLiveReference(phrase, config);
  if (found.status === "ready") return {
    accepted: true, phrase: found.entry.term, meaning: found.entry.meaning,
    verified: found.entry.verified, source: found.entry.source, sourceUrl: found.entry.sourceUrl,
    availability: "live", provenance: "discovered",
  };
  if (found.status === "unavailable") return {
    ...local, code: "REFERENCE_UNAVAILABLE", retryable: true,
    error: "The live dictionary is taking a pause. We haven’t guessed a meaning. Try this phrase again shortly.",
  };
  return { ...local, error: "We haven’t found a Singapore English definition for this phrase in our collection or the live dictionary. Try another spelling or a suggested phrase." };
}

export async function requireCheckedTerm(phrase: string, config: { db?: D1Database; fetcher?: typeof fetch; timeoutMs?: number }): Promise<CorpusTerm> {
  const result = await checkPhrase(phrase, config);
  if (!result.accepted) throw new UnknownPhraseError(phrase, result);
  return { term: result.phrase, meaning: result.meaning, verified: result.verified, source: result.source, sourceUrl: result.sourceUrl };
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
