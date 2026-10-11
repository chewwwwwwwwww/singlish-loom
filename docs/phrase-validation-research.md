# Phrase recognition before generation

Research checked 11 October 2026. This recommendation is scoped to the event app, not a general claim to identify every possible Singlish utterance.

## Bounded implementation

Recognise the original 27 curated terms plus the 15 source-reviewed entries in `dictionary-extension.json`. Each extension definition is our own brief paraphrase. Exact canonical terms and documented aliases are eligible to generate fiction and artwork. Recognition and verification remain separate: accepting the user's curated phrase does not upgrade an unsourced meaning to verified.

Use these four outcomes before spending a generation allowance, calling a text/image model, or inserting a wall record:

| State | Behavior |
|---|---|
| Curated exact/approved alias | Canonicalise, use stored meaning and its existing provenance/verification flag; generate myth/voice only. |
| Reviewed dictionary exact/approved alias | Use stored sourced definition, show source, then allow text and uncached artwork. |
| Clear possible typo | Return structured `suggestion_required`, one or a few explicit options; visitor chooses before a new request. No silent fuzzy acceptance. |
| Unrecognised | Return structured `unrecognized` and “We don't recognise this phrase in our current collection yet.” Offer known choices. No invented meaning, story, artwork or wall tile. |

No match is not proof that a phrase does not exist. Do not say “not Singlish”. Do not recognise arbitrary text merely because it contains “lah”, a known substring, or common English words. Generic text safety/length validation still runs first. Backend must enforce the gate even when the client is bypassed. Resolve recognition before idempotency lookup so an old unsupported record cannot bypass the new gate.

The existing `matchCorpus` exact/alias policy is sound. Its current `suggestCorpus` allows one edit for longer words, two for very long phrases, unique best match, same word count, and an explicit visitor choice. Extend against both reviewed collections. Conservative short-word suggestions may be offered without acceptance; never turn “shop” into “chope” automatically.

Acceptable response shape: `{code: "unrecognized" | "suggestion_required", error: string, suggestions: [{term, meaning}]}` with 422. A dedicated `/api/recognize` can improve preview feedback, but the authoritative gate belongs inside POST `/api/generate` too.

All 27 prepared illustrations can exist independently of whether a meaning is verified. Imagery is creative interpretation, never historical evidence. Keep the 15 extension entries outside the prepared collection so, for example, `paiseh` demonstrates a legitimately recognised new phrase with a first illustration generated once and reused later.

## singlish.app

The [public dictionary](https://singlish.app/dictionary) lists 210 expressions and links individual `/dictionary/<term>` pages. Its footer says “Some Rights Reserved” rather than declaring an open data license. The [published terms](https://singlish.app/terms) explicitly restrict copying or using dictionary words, meanings, examples, text and audio without consent. No documented dictionary API was found in the pages/searches checked; the linked `/llms.txt` could not be fetched. An AI discovery file would not itself grant a reuse license. Do not make its HTML a production data feed, mirror its collection, or scrape all 210 entries without the owner's permission. Our 15-entry extension uses other sources.

## Practical sources and later expansion

- [STB's 2015 travel glossary](https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-tos-singaporelbb-2015-complete-small.pdf), p. 7: kiasu, makan, bo pian, catch no ball, kopitiam, kena; several additional culturally sensitive labels deliberately omitted.
- [STB current Singlish 101](https://www.visitsingapore.com/travel-tips/about-singapore/): bo jio, jia lat, alamak. Its source search-index view provides the glossary; a direct fetch returns a minimal app shell.
- [STB 2016 guide](https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-q2-2016-eng-full-guide-single.pdf), p. 15: tapao spelling, paiseh, lah.
- [NUS study summary](https://fass.nus.edu.sg/srn/2022/08/10/you-cant-tell-people-to-not-speak-it-says-nus-don-but-where-does-singlish-stand-now/): paiseh; [Cynthia Siew's first-person research account](https://fass.nus.edu.sg/news/2025/11/27/value-of-human-word-associations-in-time-generative-language-models/): sian. The latter also reports limits in LLM modeling of Singlish meaning/humor.
- [NIE-hosted linguistic paper](https://repository.nie.edu.sg/server/api/core/bitstreams/090ee6f2-d76a-4fe4-8961-ac2005f72913/content), Tables 6–7: tone-sensitive particles, tapau, and several senses. Do not collapse a particle to a single English translation.
- [COLING 2022 Singlish Message Paraphrasing](https://aclanthology.org/2022.coling-1.345.pdf), Tables 2 and 10: lah, lor, leh, makan, sian, ta pau. The artifact contains original paraphrases, not copied examples.

`kiasi` and `tar pau` were not added in this bounded pass because a suitably strong direct definition/spelling source was not fetched. They can be reviewed next; their omission does not deny their use.

[Wiktionary](https://en.wiktionary.org/wiki/Category:Singlish) is a possible open extension source. [MediaWiki documents its Action API](https://www.mediawiki.org/wiki/API:Main_page) and [category enumeration](https://www.mediawiki.org/wiki/API:Categorymembers). A later ingestion job can enumerate Singlish/Singapore English categories, retrieve English senses, then human-review exact entries and freeze source revision IDs. Checking only whether a word has a page is inadequate: `chope`, for example, also has senses in other languages. Respect [API etiquette](https://www.mediawiki.org/wiki/API:Etiquette), cache requests, and use an identifying User-Agent. Original Wiktionary text is [CC BY-SA 4.0/GFDL](https://en.wiktionary.org/wiki/Wiktionary:Copyrights); retain entry/revision attribution, license information and change notices for any reused/adapted definitions, and avoid external quotation/audio rights. We did not import Wiktionary text here.

The [2024 EURALI paper](https://aclanthology.org/2024.eurali-1.7/) describes a larger CC-BY-SA Singlish dictionary partly drafted with ChatGPT and subsequently reviewed. It is useful as a candidate resource, not independent validation of every entry or a reason to permit arbitrary LLM guesses.
