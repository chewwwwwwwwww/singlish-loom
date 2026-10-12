# Phrase recognition before generation

Research checked 11–12 October 2026. Implementation updated 12 October 2026. This policy is scoped to the event app, not a claim to identify every possible Singlish utterance.

## Current dictionary-first implementation

Recognise the original 27 curated terms plus 16 source-reviewed entries in `lib/dictionary.ts`, including “your head” and its documented la/lah/ah variants. Each local definition is our own brief paraphrase. Exact terms, documented aliases, spacing/hyphen variants and a uniquely closest small spelling slip reuse one canonical phrase. Recognition and verification remain separate: accepting a curated phrase does not upgrade an unsourced meaning to verified.

For other inputs, check English Wiktionary senses, followed by a bounded fuzzy title search. Every candidate must independently have a definition explicitly marked Singapore or Singlish. Clear long spelling variants may resolve automatically; several supported possibilities and short uncertain spellings require a visitor choice. Semantic similarity alone cannot establish identity or verify a meaning. A redirected title must be confirmed by Wiktionary's own normalized/redirect chain.

Use these outcomes before spending a generation allowance, calling a text/image model, or inserting a new wall record:

| State | Behavior |
|---|---|
| Prepared collection or clear approved variant | Canonicalise, use stored meaning and its existing verification flag; reveal prepared artwork and writing with no AI call. |
| Reviewed local entry or confirmed live dictionary match | Show the matched phrase, fixed meaning and source; allow text and uncached artwork. |
| Several plausible matches or uncertain short spelling | Return HTTP 422 `AMBIGUOUS_PHRASE` with supported meanings and source links; visitor chooses before a new request. No creative bypass. |
| Completed lookup with no supported match | Return HTTP 422 `UNKNOWN_PHRASE` and `canCreateOriginal: true`; pause generation and offer edit, collection or an explicit original-expression choice. |
| Dictionary unavailable, budget exhausted or incomplete check | Return HTTP 503 `REFERENCE_UNAVAILABLE`, `retryable: true`; offer retry or prepared collection. No creative bypass. |
| Explicit original-expression choice after a completed empty lookup | Both `/check` and `/generate` receive `allowCreative: true` and recheck. Accept only as creative, unverified, with neutral context and null source fields. Safety-approved model writing is required before artwork or storage. |

No match is not proof that a phrase does not exist. The interface says “We couldn’t find this phrase in our references.” Do not say “not Singlish”. A familiar substring or a final “lah” does not verify arbitrary text. Input safety/length checks run first. The backend enforces the gate when the client is bypassed; the flag cannot override uncertainty or an outage. Idempotent retries of an already completed request can retrieve its saved record without making a new contribution.

The current helper in `lib/phrase-variants.ts` uses one edit for longer compact spellings and two for very long phrases; ties do not authorize automatic matching. Short-word suggestions require selection. It never strips tone-sensitive particles globally or turns an arbitrary nearby word into a dictionary fact. The original-expression choice is tied to the input just checked; typing, speech or format changes clear that choice and discard late responses.

`POST /api/check` returns supported phrase data or `{accepted: false, code, error, phrase, suggestions}`. Suggestions use `{phrase, meaning, source?, sourceUrl?}`. Only a completed empty search adds `canCreateOriginal: true`; invalid input may also use `UNKNOWN_PHRASE` without that flag. The authoritative check also runs inside POST `/api/generate`.

All 27 prepared illustrations can exist independently of whether a meaning is verified. Imagery is creative interpretation, never historical evidence. The 16 reviewed entries remain outside the prepared collection so, for example, `paiseh` demonstrates a recognised additional phrase with a first illustration generated once and reused later.

Live retrieval stays on `en.wiktionary.org`, bounds every response to 512 KiB, uses an eight-second total deadline across all HTTP calls, and charges every search or candidate fetch to a 3,000-request allowance per Singapore day. A lookup uses at most eight nearby title hits and 18 HTTP requests. Source revisions and temporary misses are cached in D1. Old exact-only negative cache entries are versioned out because they do not prove a broader search was completed. The bounded title search will still miss some living expressions; it is a spelling aid, not exhaustive language validation.

## singlish.app

The [public dictionary](https://singlish.app/dictionary) lists 210 expressions, including “your head”, and links individual `/dictionary/<term>` pages. Its footer says “Some Rights Reserved” rather than declaring an open data license. The [published terms](https://singlish.app/terms) restrict copying or using dictionary words, meanings, examples, text and audio without consent. No documented dictionary API was found in the pages/searches checked; the linked `/llms.txt` could not be fetched. An AI discovery file would not itself grant a reuse license. It is useful as a human reference, but the app does not make its HTML a production feed, mirror its collection or scrape all 210 entries. The local extension uses other published sources and the live feed uses Wiktionary.

## Practical sources and later expansion

- [STB's 2015 travel glossary](https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-tos-singaporelbb-2015-complete-small.pdf), p. 7: kiasu, makan, bo pian, catch no ball, kopitiam, kena; several additional culturally sensitive labels deliberately omitted.
- [STB current Singlish 101](https://www.visitsingapore.com/travel-tips/about-singapore/): bo jio, jia lat, alamak. Its source search-index view provides the glossary; a direct fetch returns a minimal app shell.
- [STB 2016 guide](https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-q2-2016-eng-full-guide-single.pdf), p. 15: tapao spelling, paiseh, lah.
- [NUS study summary](https://fass.nus.edu.sg/srn/2022/08/10/you-cant-tell-people-to-not-speak-it-says-nus-don-but-where-does-singlish-stand-now/): paiseh; [Cynthia Siew's first-person research account](https://fass.nus.edu.sg/news/2025/11/27/value-of-human-word-associations-in-time-generative-language-models/): sian. The latter also reports limits in LLM modeling of Singlish meaning/humor.
- [NIE-hosted linguistic paper](https://repository.nie.edu.sg/server/api/core/bitstreams/090ee6f2-d76a-4fe4-8961-ac2005f72913/content), Tables 6–7: tone-sensitive particles, tapau, and several senses. Do not collapse a particle to a single English translation.
- [COLING 2022 Singlish Message Paraphrasing](https://aclanthology.org/2022.coling-1.345.pdf), Tables 2 and 10: lah, lor, leh, makan, sian, ta pau. The artifact contains original paraphrases, not copied examples.

`kiasi` and `tar pau` were not added in this bounded pass because a suitably strong direct definition/spelling source was not fetched. They can be reviewed next; their omission does not deny their use.

[Wiktionary](https://en.wiktionary.org/wiki/Category:Singlish) is the app's live open reference source. [MediaWiki documents its Action API](https://www.mediawiki.org/wiki/API:Main_page) and [category enumeration](https://www.mediawiki.org/wiki/API:Categorymembers). The app retrieves on demand rather than bulk-importing categories. Checking only whether a word has a page is inadequate: `chope`, for example, also has senses in other languages. The implementation follows [API etiquette](https://www.mediawiki.org/wiki/API:Etiquette) with cached requests and an identifying User-Agent. Original Wiktionary text is [CC BY-SA 4.0/GFDL](https://en.wiktionary.org/wiki/Wiktionary:Copyrights); results retain fixed revision attribution, license information and notice that one selected sense is shortened. No external quotation or audio is imported. Category ingestion with human review remains a possible later expansion.

The [2024 EURALI paper](https://aclanthology.org/2024.eurali-1.7/) describes a larger CC-BY-SA Singlish dictionary partly drafted with ChatGPT and subsequently reviewed. It is useful as a candidate resource, not independent validation of every entry or a reason to permit arbitrary LLM guesses.
