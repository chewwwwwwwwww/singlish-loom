import { matchCorpus, normalizePhrase, validatePhrase } from "./corpus";
import { resolveSupportedTerm, suggestSupportedTerms } from "./dictionary";
import { resolveLiveReference } from "./live-reference";
import { canonicalCreativePhrase, resolvePhraseVariant } from "./phrase-variants";
import type { CorpusTerm, PhraseCheckResponse, PhraseSuggestion, UnknownPhrase } from "./types";

export interface PhraseCheckConfig {
  db?: D1Database; fetcher?: typeof fetch; timeoutMs?: number; allowCreative?: boolean;
}

function suggestion(entry: CorpusTerm): PhraseSuggestion {
  return { phrase: entry.term, meaning: entry.meaning, source: entry.source, sourceUrl: entry.sourceUrl };
}

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
    error: "We couldn't find a supported match in our checked references. Check the spelling or choose a suggested phrase.",
    suggestions: suggestSupportedTerms(phrase).slice(0, 3).map(suggestion),
  };
}

export async function checkPhrase(phrase: string, config: PhraseCheckConfig = {}): Promise<PhraseCheckResponse> {
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
  const local = checkSupportedPhrase(submittedPhrase);
  const found = await resolveLiveReference(submittedPhrase, config);
  if (found.status === "ready") {
    // Search may rediscover a saved collection term. Its reviewed/draft meaning
    // and evidence label stay identical when the visitor follows the suggestion.
    const saved = checkSupportedPhrase(found.entry.term);
    const resolved = saved.accepted ? saved : {
      accepted: true as const, phrase: found.entry.term, meaning: found.entry.meaning,
      verified: found.entry.verified, source: found.entry.source, sourceUrl: found.entry.sourceUrl,
      availability: "live" as const, provenance: "discovered" as const,
    };
    return { ...resolved, submittedPhrase, resolution: found.entry.term === submittedPhrase ? "exact" : "spelling" };
  }
  if (found.status === "unavailable") return {
    accepted: false, code: "REFERENCE_UNAVAILABLE", phrase: submittedPhrase,
    error: "The dictionary is temporarily unavailable. Please retry so we can check this phrase before weaving it.",
    suggestions: [], retryable: true,
  };
  const candidates = [...new Map([
    ...(found.status === "choices" ? found.entries.map(suggestion) : []),
    ...(local.accepted ? [] : local.suggestions),
  ].map(entry => [entry.phrase, entry])).values()].slice(0, 3);
  if (candidates.length) return {
    accepted: false, code: "AMBIGUOUS_PHRASE", phrase: submittedPhrase,
    error: "We found similar expressions. Choose the one you mean so we use the right meaning and artwork.",
    suggestions: candidates,
  };
  if (config.allowCreative !== true) return {
    accepted: false, code: "UNKNOWN_PHRASE", phrase: submittedPhrase,
    error: "We couldn't find a supported match in our references. This doesn't mean the phrase doesn't exist. Check another spelling or weave it as an original expression.",
    suggestions: [], canCreateOriginal: true,
  };
  // Visitors explicitly choose invention only after a completed reference check
  // with no supported candidates. Outages and ambiguous meanings never bypass it.
  return {
    accepted: true, phrase: canonicalCreativePhrase(submittedPhrase),
    meaning: "No confirmed dictionary meaning is available. This artwork is a creative interpretation of the visitor’s phrase; its meaning depends on context.",
    verified: false, source: null, sourceUrl: null,
    availability: "live", provenance: "creative", submittedPhrase,
    resolution: "creative", referenceStatus: "not_found",
  };
}

export async function requireCheckedTerm(phrase: string, config: PhraseCheckConfig): Promise<CorpusTerm> {
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
