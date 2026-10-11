import { CORPUS, matchTermVariants, normalizePhrase } from "./corpus";
import type { CorpusTerm } from "./types";

// A bounded, source-reviewed index, not a claim to cover all living Singlish.
// Definitions are editorial paraphrases. No scraped commercial dictionary.
export const DICTIONARY: CorpusTerm[] = [
  {
    "term": "paiseh",
    "meaning": "Feeling embarrassed or shy; sometimes an apologetic expression.",
    "verified": true,
    "source": "NUS Singapore Research Nexus: Small World of Singlish Words study",
    "sourceUrl": "https://fass.nus.edu.sg/srn/2022/08/10/you-cant-tell-people-to-not-speak-it-says-nus-don-but-where-does-singlish-stand-now/",
    "aliases": []
  },
  {
    "term": "kiasu",
    "meaning": "Afraid of losing out or missing an advantage.",
    "verified": true,
    "source": "Singapore Tourism Board: Got Singlish? travel guide, p. 7",
    "sourceUrl": "https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-tos-singaporelbb-2015-complete-small.pdf",
    "aliases": []
  },
  {
    "term": "sian",
    "meaning": "Bored or weary; also describes something tiresome.",
    "verified": true,
    "source": "NUS Faculty of Arts and Social Sciences: Cynthia Siew on human word associations",
    "sourceUrl": "https://fass.nus.edu.sg/news/2025/11/27/value-of-human-word-associations-in-time-generative-language-models/",
    "aliases": []
  },
  {
    "term": "bo jio",
    "meaning": "Why wasn't I invited? A reaction to being left out of an activity.",
    "verified": true,
    "source": "Singapore Tourism Board: Singlish 101",
    "sourceUrl": "https://www.visitsingapore.com/travel-tips/about-singapore/",
    "aliases": [
      "bojio"
    ]
  },
  {
    "term": "jialat",
    "meaning": "Things are going badly; describes a difficult or bleak situation.",
    "verified": true,
    "source": "Singapore Tourism Board: Singlish 101",
    "sourceUrl": "https://www.visitsingapore.com/travel-tips/about-singapore/",
    "aliases": [
      "jia lat"
    ]
  },
  {
    "term": "lah",
    "meaning": "A sentence-ending particle that adds emphasis or asks the listener to accept a view; tone changes its force.",
    "verified": true,
    "source": "Singlish Message Paraphrasing (COLING 2022), Table 10; NIE linguistic examples, Table 6",
    "sourceUrl": "https://aclanthology.org/2022.coling-1.345.pdf",
    "aliases": []
  },
  {
    "term": "lor",
    "meaning": "A sentence-ending particle that can signal obviousness or resignation, depending on context and tone.",
    "verified": true,
    "source": "Singlish Message Paraphrasing (COLING 2022), Table 10",
    "sourceUrl": "https://aclanthology.org/2022.coling-1.345.pdf",
    "aliases": []
  },
  {
    "term": "leh",
    "meaning": "A sentence-ending particle used for a tentative suggestion or request, or to press a differing view; tone matters.",
    "verified": true,
    "source": "Singlish Message Paraphrasing (COLING 2022), Table 10; NIE linguistic examples, Table 6",
    "sourceUrl": "https://aclanthology.org/2022.coling-1.345.pdf",
    "aliases": []
  },
  {
    "term": "makan",
    "meaning": "Eat, or have a meal.",
    "verified": true,
    "source": "Singapore Tourism Board: Got Singlish? travel guide, p. 7",
    "sourceUrl": "https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-tos-singaporelbb-2015-complete-small.pdf",
    "aliases": []
  },
  {
    "term": "tapau",
    "meaning": "Pack food to take away.",
    "verified": true,
    "source": "NIE: Repositioning Singlish in Singapore's language-in-education policies, Table 7",
    "sourceUrl": "https://repository.nie.edu.sg/server/api/core/bitstreams/090ee6f2-d76a-4fe4-8961-ac2005f72913/content",
    "aliases": [
      "tapao",
      "ta pau"
    ]
  },
  {
    "term": "alamak",
    "meaning": "An exclamation of shock, dismay or surprise.",
    "verified": true,
    "source": "Singapore Tourism Board: Singlish 101",
    "sourceUrl": "https://www.visitsingapore.com/travel-tips/about-singapore/",
    "aliases": []
  },
  {
    "term": "bo pian",
    "meaning": "There is no other choice; nothing can be done about it.",
    "verified": true,
    "source": "Singapore Tourism Board: Got Singlish? travel guide, p. 7",
    "sourceUrl": "https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-tos-singaporelbb-2015-complete-small.pdf",
    "aliases": []
  },
  {
    "term": "catch no ball",
    "meaning": "I don't understand what is being said.",
    "verified": true,
    "source": "Singapore Tourism Board: Got Singlish? travel guide, p. 7",
    "sourceUrl": "https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-tos-singaporelbb-2015-complete-small.pdf",
    "aliases": []
  },
  {
    "term": "kopitiam",
    "meaning": "A neighbourhood coffee shop or informal place to eat.",
    "verified": true,
    "source": "Singapore Tourism Board: Got Singlish? travel guide, p. 7",
    "sourceUrl": "https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-tos-singaporelbb-2015-complete-small.pdf",
    "aliases": []
  },
  {
    "term": "kena",
    "meaning": "Get or be affected by something, as in getting sunburned.",
    "verified": true,
    "source": "Singapore Tourism Board: Got Singlish? travel guide, p. 7",
    "sourceUrl": "https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-tos-singaporelbb-2015-complete-small.pdf",
    "aliases": []
  }
];

export function findDictionaryTerm(phrase: string): CorpusTerm | null {
  return matchTermVariants(phrase, DICTIONARY);
}

export function resolveSupportedTerm(phrase: string): CorpusTerm | null {
  return matchTermVariants(phrase, [...CORPUS, ...DICTIONARY]);
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return row[b.length];
}

function suggestFrom(phrase: string, entries: CorpusTerm[]): CorpusTerm[] {
  const input = normalizePhrase(phrase);
  if (input.length < 4 || resolveSupportedTerm(input)) return [];
  const wordCount = input.split(" ").length;
  const threshold = input.length >= 16 ? 2 : 1;
  return entries.map(entry => ({ entry, distance: Math.min(...[entry.term, ...(entry.aliases ?? [])].map(alias => {
    const normalized = normalizePhrase(alias);
    return normalized.split(" ").length === wordCount ? distance(input, normalized) : Infinity;
  })) })).filter(candidate => candidate.distance <= threshold)
    .sort((a, b) => a.distance - b.distance || a.entry.term.localeCompare(b.entry.term))
    .slice(0, 3).map(candidate => candidate.entry);
}

// Suggestions are choices only; approximate matches never authorize generation.
export function suggestDictionaryTerms(phrase: string): CorpusTerm[] {
  return suggestFrom(phrase, DICTIONARY);
}

export function suggestSupportedTerms(phrase: string): CorpusTerm[] {
  return suggestFrom(phrase, [...CORPUS, ...DICTIONARY]);
}
