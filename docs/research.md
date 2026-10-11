# Singlish Loom: feasibility, event fit, and model choice

Research checked 11 October 2026. Recommendations below are judgments for this project; vendor descriptions are attributed. Exact requested model names were searched and their official pages fetched before using local model-selection guidance. This is research, not a claim that deployment, microphone accuracy, or API access has been tested.

## Event evidence and competition positioning

The [Common Ground event page](https://luma.com/yjffwqr2) works when its tracking query is removed. It describes an in-person one-day makeathon on 11 October at SQ Collective Singapore, two tracks (Design × Tech and Culture × Tech), no fixed medium, Codex as primary technology partner, and a US$5,000 prize pool. It explicitly accepts websites, visual experiments, AI experiences, and speculative prototypes. Its introductory essay connects computing with the Jacquard loom and Ada Lovelace's weaving metaphor. Singlish Loom therefore has unusually close conceptual fit. The supplied prize screenshot provides the finer award categories; these were not independently listed on the public event page.

**Project judgment:** enter Culture × Tech first. Make the work a participatory language installation: everyday phrases become individual artifacts and a collective composition. Its Common Ground case is strongest when visitors contribute how they use a phrase, rather than only pressing a generation button. Design × Tech remains plausible if the weaving interaction and artifact quality are exceptional. Best Use of Tech needs visible reasoning about why generation and live participation matter: separate attested meaning from deliberately invented folklore, turn a phrase into a new cultural object, and let the room co-author the wall.

**90-second demonstration:** invite someone to say “blur sotong”; show the editable transcript; weave the result; point to the verified meaning and the fiction stamp; create a poster; scan its QR; show that the same artifact appears on another phone and joins the projection wall. End with the wall as a portrait of the room's language.

## Browser voice intake

[MDN's SpeechRecognition documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) marks recognition as limited availability. Chrome can use a server recognition engine, so audio can leave the device and recognition may fail offline. [MDN's implementation guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API) shows unprefixed/prefixed feature detection, setting the language explicitly, interim results, and alternative hypotheses. The specification requires informed user consent and an obvious recording indication; unsupported languages and unsupported phrase biasing are defined errors. [Web Speech API specification](https://webaudio.github.io/web-speech-api/)

Implementation recommendations:

- Feature-detect `window.SpeechRecognition || window.webkitSpeechRecognition`; always keep typing and sample chips usable.
- Request `lang = 'en-SG'`, but treat it as a language preference, not evidence that a particular engine recognizes Singlish well. No fetched source establishes Singlish transcription accuracy. Correcting the text before submission is essential in a noisy event.
- Use hold-to-talk for pointer interaction plus a keyboard-accessible click-to-start/click-to-stop route. Stop on release/cancel/blur and handle permission, audio-capture, network, no-speech, and language errors with concrete copy.
- Never automatically submit a recognized transcript. Display it in the editable field, then let the visitor choose Weave.
- State by the mic that the browser's speech service may process audio. Do not claim on-device privacy unless that execution path is both selected and confirmed available.
- Optional phrase biasing can include corpus phrases when `phrases` exists, but must be nonessential. Older grammars are no longer an effective way to improve recognition.

Safari's initial speech recognition support uses Siri's engine and required Siri enabled in macOS/iOS settings, according to [WebKit's Safari 14.1 announcement](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/). This is historical vendor documentation, not a guarantee for the event's particular phones. Chrome's [150 beta announcement](https://developer.chrome.com/blog/chrome-150-beta) documents evolving on-device recognition quality controls. Optional local recognition remains something to feature-detect and test, not a safe universal dependency.

## Normalize cautiously

Normalize lowercase, trim, Unicode normalization, repeated spaces, and a small explicit punctuation/alias map. Exact corpus or known alias matches may receive the attested label. A fuzzy match should propose “Did you mean …?” rather than silently relabeling a different phrase as verified. Short terms such as “chim” and “chope” deserve stricter thresholds than long idioms. Do not promote an LLM guess into the corpus automatically.

Keep meaning evidence and etymology separate. A source can attest a current use without establishing the phrase's origin. The user-supplied parenthetical origin explanations need independent verification before they appear as fact. The fiction stamp should stay visible on-screen, in the poster, on the shared page, and on the wall detail.

## Generation architecture

One server route accepts a bounded phrase and optional creative format. Canonical corpus meaning is served directly from JSON; generation writes myth and voice. For unknown phrases, generated meaning is a draft. The server owns the prompt, model, provenance label, and trust status. User text is quoted data, not instructions. Validate returned strings, length, empty values, and allowed fields before saving.

Both requested OpenAI models support Structured Outputs. A strict JSON schema is preferable to prompting for loosely formatted JSON; the Responses API uses `text.format` with `type: 'json_schema'`, `strict: true`, and `additionalProperties: false`. Handle refusal or incomplete responses explicitly and validate creative line counts after parsing. [Official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs)

Fallback recommendations: curated fixtures for known terms, openly marked “studio sample”; a reliable neutral template for unknown phrases that remains “unverified draft”; no fake claim that a sample was just generated. Fail over after timeout, network error, malformed output, unavailable model, or missing key. Latency theatre should end with the actual request state, and must never be an unexplained infinite animation.

## Live wall and persistence

For a shared wall, all visitors must write to one central store. Browser-only storage and BroadcastChannel are useful for a local demo but do not synchronize attendees' phones. BroadcastChannel communicates among browsing contexts of the same origin. [MDN BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)

The simplest event implementation is a single Node server with a durable JSON/SQLite store and polling every few seconds; it works across devices when served from a reachable address. A server-sent event feed is a good optional improvement because the wall only needs server-to-client updates; EventSource is one-way. Fetch a snapshot on connection/reconnection, then apply insert events with IDs. [MDN server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)

For a public hosted version, Postgres/Supabase is a straightforward fit. Supabase recommends database Broadcast for scalability/security; Postgres Changes has less setup but weaker scaling. Store the actual artifacts in an application table, then use events only to notify clients to refresh or append. Realtime is not the durable artifact store: Supabase's broadcast message partitions are cleaned up after three days. [Supabase database subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes), [Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast)

Recommended record: immutable artifact ID, raw phrase, canonical phrase/corpus ID, meaning and evidence snapshot, myth, voice, format, palette/pattern seed, creation timestamp, generation mode, moderation/display status, optional contributor nickname. Keep wall statistics server-side. Distinguish submissions from unique phrases, and mark seed/demo tiles as samples rather than inventing participant activity. Limit writes and keep arbitrary HTML out of both generation and projection.

A file inside an ephemeral/serverless runtime is not sufficient persistence. A central database or persistent host volume must be configured before claiming that the wall will survive redeployments. Polling should remain available if realtime transport disconnects.

## Poster and QR take-home

`?term=` is useful for selecting a corpus term but cannot reproduce a particular newly generated myth. Save each completed artifact and share `/woven/<id>` or `?artifact=<id>`. Open the stored content; do not generate again on page load. The poster should carry its stable URL, fiction/provenance labels, and visual seed.

Use QR generation locally, with a high-contrast code and clear surrounding quiet zone. The maintained `qrcode` package supports browser/server usage, canvas and data-URL output, and configurable error correction; its documented default quiet zone is four modules. [node-qrcode README](https://github.com/soldair/node-qrcode/blob/master/README.md?plain=1) The GitHub renderer failed on a repeated fetch, but its indexed README content was available; verify the installed library API while implementing.

A code containing localhost only works on the same computer. A phone-scannable take-home requires a public HTTPS base URL or the known reachable event network address. Show a preview/share link condition honestly until hosting is configured. Export the poster as SVG/PNG or use browser print styles; a printable artifact remains useful when network access is poor.

## Accessibility and motion

The loom animation is nonessential motion: respect `prefers-reduced-motion`, replacing motion with a static woven pattern and plain status text. W3C describes disabling nonessential motion triggered by interaction. [W3C animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)

Provide pause/resume for the auto-updating projection wall, keyboard operation, visible focus, and a nonanimated count. Automatic visual movement and auto-updating content fall under Pause, Stop, Hide considerations. [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)

Use a polite live status for “Listening”, “Weaving”, “Ready”, or errors without stealing focus; avoid announcing every animation frame or wall tile. Programmatic status messages let assistive technology convey updates without moving focus. [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)

Canvas should be decorative/hidden from assistive technology. Meaning, myth, and voice belong in normal semantic HTML. Use text labels in addition to colors to distinguish trust states. Verify mobile layout and long phrases before projection.

## Exact model comparison

| Model | Officially documented role | Standard API text price / 1M tokens | Recommendation for this task |
| --- | --- | --- | --- |
| GPT-6.1 Sol, `gpt-6.1-sol` | Near-Astra performance for complex coding, computer use, professional work at lower cost; supports image input and Structured Outputs | $2 input / $10 output | Main implementation and rapid refinement; runtime myth/voice generation after a small task-specific evaluation |
| GPT-6 Astra, `gpt-6-astra` | Most capable OpenAI model for demanding reasoning, coding, computer use, research, document creation; image input and Structured Outputs | $10 input / $50 output | One focused creative-direction/interaction critique pass if quality is the overriding priority |
| Claude Opus 5.5 | Anthropic describes stronger agentic coding and professional work; official release 22 September 2026 | $4 input / $20 output | Valid alternative, especially if the user already has a strong Claude workflow; no sourced evidence that it beats these exact OpenAI models in design taste |

Sources: [GPT-6.1 Sol official model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [GPT-6 Astra official model page](https://developers.openai.com/api/docs/models/gpt-6-astra), [Anthropic Opus 5.5 announcement](https://www.anthropic.com/claude-opus-5-5). These are API prices, not the cost or usage allowance of this Codex chat.

[OpenAI's model-selection guidance](https://developers.openai.com/api/docs/guides/model-selection) explicitly places Sol extra-high effort with polished deliverables and connected visual systems, and Astra medium with ambitious projects requiring broad context and reliable interactions. It recommends comparing models on the same task. For this one-day event, I would use **Sol at high or extra-high for the build**, and spend any Astra budget on **one concrete visual and interaction review after the first working screen**. If there is no time/cost constraint and only one model may be chosen, Astra is a defensible default. This is a workflow recommendation, not a benchmark claim that Astra has superior aesthetic taste. Mobbin evidence, a specific art direction, and rendered screenshots should drive refinement.

No source establishes a universal design winner among these exact three models. Vendor benchmark suites have different tasks and harnesses and should not substitute for an evaluation of this app. A small comparison could use the same 8–12 phrases, measure dialect naturalness, coherent marked fiction, nonstereotyped storytelling, four-line fidelity, schema success, and perceived wait time, with local Singlish speakers judging the writing blind. Runtime short-form generation and the model used to build the UI can be chosen independently.

## What to complete before calling it event-ready

1. Source-linked corpus meanings and clearly separate origin uncertainty.
2. One polished mobile intake/result/poster path with honest fallback modes.
3. Fuzzy-match confirmation and editable speech transcript.
4. One genuinely shared persisted wall, tested from a second browser/device.
5. A stable artifact link that reproduces the same generated content.
6. Phone-scanned QR on the reachable deployed base URL.
7. Reduced-motion and keyboard path, long phrase layout, rejection/error/timeout handling.
8. A short presentation showing what the room collectively makes, and an explicit distinction between evidence and invention.


---

# Singlish Loom: cultural research and product implications

Research date: 11 October 2026. Bounded review of the 27 phrases supplied in the brief. `RTK.md` was not found under the task workspace, Documents/Codex, or .agents search locations; no app files changed.

The strongest version is a living phrase portrait: a real meaning with provenance, an explicitly fictional origin myth, and a fresh story. The distinction between cultural record and imagination is a design feature. It makes AI visibly useful without pretending that a fluent origin story is history.

## What the research changed

- Corpus membership is not verification. The starter list contains plausible meanings, contextual omissions, and uncertain origin claims. Store verification and source per entry.
- The police-siren explanation for **steady pom pi pi** should be removed. [CNA's documentary](https://www.channelnewsasia.com/singapore/singlish-threat-society-research-singapore-identity-code-switch-2866596) reports a Hokkien blow/whistle account. Its explanations for kancheong spider and pattern more than badminton use tentative language; preserve that uncertainty.
- **Blur sotong** has competing folk explanations. [Makansutra](https://makansutra.com/foodglish-you-dont-blur-sotong-hor/) discusses squids clustered under fishing lights. The brief's ink-cloud account should never sit under a verified stamp.
- **Double confirm** often means checking again. **Can is can** can introduce a reservation. **Orhor** is closer to caught-you/you're-in-trouble than serves-you-right. **One time good one** includes do-it-well-once and thorough-scolding contexts. Context should appear as a short nuance, not an overconfident one-line translation.
- **Shiok** has well-supported meanings and an immediate Malay donor; deeper ancestry needs care. [Victor Mair's analysis](https://languagelog.ldc.upenn.edu/nll/?p=27080) quotes the OED's Malay/Persian/Arabic account after discussing other proposals.
- No adequate authoritative source was established here for my grandma run faster than you, last touch, i.e. to say, or the exact you-think-I-thought-who-confirm phrase. These can remain playful corpus entries labelled unverified.

The machine-readable audit, with sources and limitations, is in `corpus-research.json`.

## Cultural depth worth building

Singlish is more than swapping English words for slang or adding lah. [Gwee Li Sui's publisher sample](https://www.marshallcavendish.com/docs/default-source/default-document-library/sample-spreads---leeter-spiaking-singlish-1.pdf?sfvrsn=6c378fd_1) treats particles, tone, context and changing usage as central. Generated voice should use natural syntax, sparse appropriate particles and small local observations. Avoid writing every speaker as an exaggerated caricature.

The strongest additional interaction is a tiny, optional visitor memory: **“Who says this in your life?”** A parent, colleague, school friend or auntie can become a credited human memory beside the AI story. These memories make the wall a collective cultural object. They should be clearly visitor-contributed, with public display chosen explicitly; AI fiction remains a separate pane. This is the clearest route to Common Ground: visitors contribute lived experience, designers shape the artefact, and code connects individual phrases into a shared installation.

Treat language tags as routes a word travelled, not as a speaker's identity. Singlish crosses ethnic and generational boundaries; an origin tag must not imply that a word belongs exclusively to one community. Unknown origin is an honest, worthwhile result.

## Practical credibility details

Keep a small source link in the meaning pane and a fuller provenance view in the share page. Separate statuses for meaning, origin and story. For fuzzy matches, show **“Heard as …”** and let the visitor correct the phrase before generating. A fuzzy match must never create certainty where the input differs in meaning.

Fallback stories should say **“prepared myth — fiction”** or show a **“demo library”** marker. The requested just-now stamp is inaccurate for stored samples. Preserve the fiction notice on the poster, wall detail and any download, since those are the places a playful myth may lose its surrounding context.

Use original short stories, not copied dictionary examples or song lyrics. Definitions in the JSON are paraphrases. Do not scrape whole dictionaries into the production app; check source rights if expanding beyond this bounded seed corpus. Link provenance rather than reproducing long entries.

## Evidence limitations

NLB searches did not expose a comprehensive authoritative phrase-by-phrase lexicon. Two established independent dictionaries, Jack Lee's Singlish Dictionary and Chimbridge, could not be fetched through the web tool. [CNA's profile of Chimbridge](https://cnalifestyle.channelnewsasia.com/living/chimbridge-singlish-dictionary-daniel-goh-414621) describes careful research and the difficulty of tracing terms; it supports using the resource for later human review, not asserting unseen entries as evidence.

The [Singapore Tourism Board guide](https://www.visitsingapore.com/content/dam/desktop/global/about-singapore/traveller-information/466-q3-2016-eng-full-guide-single.pdf) and [Singapore Global Network guide](https://singaporeglobalnetwork.gov.sg/wp-content/uploads/2021/02/SGN-The-Insiders-Guide-on-What-Its-Like-To-Live-in-Singapore.pdf) are useful primary sources for chope and shiok. NTU's wake-up-your-idea guide and NUS's chim teaching material were available only as indexed excerpts; the JSON records that limitation.
