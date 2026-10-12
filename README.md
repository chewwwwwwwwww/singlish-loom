# Singlish Loom

A participatory Singlish artwork for Common Ground Makeathon, 11 October 2026. Visitors weave a phrase into a textile illustration, a sourced meaning, an explicitly fictional myth, and a story or four-line lyric. Each contribution adds a character or physical object to one living kopitiam scene. Familiar phrases bring cups, orders, tissue packets, seats or plants. A gallery explores the contributed phrases, and each saved thread has an illustrated QR poster.

## Live demo

- Create: https://singlish-loom-bc.activepearl4.chatgpt.site
- Wall: https://singlish-loom-bc.activepearl4.chatgpt.site/wall
- Gallery: https://singlish-loom-bc.activepearl4.chatgpt.site/wall?view=gallery
- Projection: https://singlish-loom-bc.activepearl4.chatgpt.site/wall?project=1
- Cultural sources and labels: /about

The 27 curated phrases have complete prepared stories and four-line lyrics, served immediately with the prepared art collection and no AI calls. Additional source-reviewed terms can receive fresh Gemini writing and a saved illustration, including "your head" and its la/lah/ah variants. Other phrases receive an exact-entry Wiktionary lookup followed by a bounded search for similar dictionary titles. If the completed check finds no supported match, generation pauses and offers an explicit "Weave it as an original expression" choice. That choice can create clearly unverified writing and artwork.

Every submission is checked before invention. Known phrases, approved aliases, and unique spacing or hyphen variants resolve to one canonical phrase. A uniquely closest small spelling error is corrected automatically; several plausible matches or uncertain short spellings require an explicit supported-phrase choice. Particles are not stripped globally because they can change an expression's force. The live lookup checks English senses and similar dictionary titles; only a definition explicitly labelled Singapore or Singlish becomes dictionary-backed. A spelling redirect must be confirmed by Wiktionary's own title mapping. Semantic similarity or a phrase merely containing "lah" does not establish a match. The fixed extracted definition and revision are cached in D1, with source links shown before generation.

No supported match is not a claim that an expression does not exist. It returns a structured missing result without calling a text/image model or adding a contribution. Only after a completed, empty search may visitors choose the original-expression route. A dictionary outage instead returns a retryable error; it never offers a creative bypass or calls the expression invalid. Both `/check` and `/generate` enforce this policy server-side. Creative writing has no claimed dictionary definition, fabricated source or verification stamp. A safe model response is required before an original expression can trigger artwork generation or join the mural; provider failures cannot bypass that check with a fallback.

Source-backed meanings always come from fixed references, including for live results. Newly discovered dictionary definitions have Wiktionary contributor attribution, a permanent revision link and CC BY-SA 4.0 licensing; only their formatting is adapted. Those attributed definition extracts remain available under the same license: https://creativecommons.org/licenses/by-sa/4.0/. Ten of the original 27 meanings have the verified label; the other original meanings retain their draft label. Creative expressions have a neutral explanation that no published meaning was confirmed; Gemini does not turn them into verified definitions or populate the dictionary reference cache. Recognition and meaning confidence are separate. Myths are fiction in every mode.

## Run locally

Use Node 22.15 or newer; Node 24 was tested. Install with `npm ci`, then `npm run build`. On a new local database, apply these migrations in order, once each:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_dashing_master_mold.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_funny_ogun.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_optimal_ozymandias.sql
npm run dev
```

Local and hosted D1 are separate. Never replay an applied migration. Source-controlled Drizzle migrations are applied to hosted D1 by Sites during publication.

## Vercel deployment

This repository also supports native Next.js on Vercel. `vercel.json` uses `npm run build:vercel`; the default `npm run build` remains the existing Sites/Cloudflare build. The native Next server aliases its API handlers to `lib/vercel-loom.ts`, which forwards only the public loom endpoints to the existing event backend. Both frontends share the same D1 contributions, R2 images and Gemini service. Vercel needs no Gemini key or database credential.

The proxy validates write origins, bounds request bodies, rejects redirects and forwards no visitor cookies or credentials. `/generate` remains compatible with `/api/generate`. Image and writing generation stay within the configured 180-second function duration. This frontend depends on the existing public Cloudflare site; moving the backend is a separate migration.

Run `npm run build:vercel`, then `npm run start:vercel` for a native production preview. `node --import tsx scripts/test-vercel-proxy.ts` exercises forwarding, blocked origins and paths, body limits, unavailable upstreams and legacy endpoint compatibility.

## Live AI

Set `GEMINI_API_KEY` as a secret in the Sites runtime environment and redeploy. `GEMINI_TEXT_MODEL` defaults to `gemini-3.8-flash`; `GEMINI_IMAGE_MODEL` defaults to `gemini-nano-banana-2.1`. These models were available to the event's configured key. For local use, put the same variables in ignored `.dev.vars`. The existing OpenAI text adapter remains available when no Gemini key is configured, using `OPENAI_API_KEY` and `OPENAI_MODEL` (default `gpt-6.1-sol`).

Keys and prompts stay server-side. No API key is bundled. Terms outside the 27 prepared phrases use a text provider after source checking or an explicit original-expression choice. Dictionary retrieval has an eight-second total timeout across exact lookup, title search and candidate checks, a fixed public host, a 512 KiB response cap per response, a single-request lease, a short negative cache and a 3,000 HTTP-request allowance per Singapore day. Every search or candidate fetch consumes that allowance. Known phrases and cached references bypass external retrieval. Gemini does not establish dictionary definitions. Writing uses a JSON schema, an 18-second timeout, and validated outputs; the server preserves fixed reference meanings and neutral creative-context notices. Source-checked terms can use a labelled authored fallback on provider errors. Unverified original expressions instead fail with HTTP 503 if no safety-approved model response is available. Refusals do not become mural contributions.

Image requests have a 55-second timeout and accept bounded JPEG, PNG, or WebP bytes. After a supported new phrase receives safe writing, its first successful illustration is saved; later submissions reuse that illustration and request fresh writing. Failed images can retry after a cooldown, while the writing remains available with an honest artwork-unavailable message.

The saved result modes are `prepared` for the instant 27-phrase collection, `live` for provider-written text on an additional supported phrase, and `demo` for an authored fallback on an additional supported phrase. Missing artwork does not change the text mode.

The visual direction is woven editorial collage: linen, cut fabric, restrained stitching, and Singapore everyday objects. It is friendly for kids without using a baby mascot aesthetic. Kanchiong spider is interpreted as a busy kopi cup with ribbon arms, never a realistic insect. See `docs/art-prompts.json` for the exact starter briefs and `docs/art-comparison.md` for the three-prompt generator comparison.

## Living kopitiam mural

The wall renders one shared room with consistent floor perspective, a counter, table and seating. The 27 prepared phrases have transparent cut-fabric motifs derived from their existing visual direction; original full illustrations remain in the gallery and posters. Lepak and bo jio have scene-native character motifs, while other new artwork decorates a painted kopi cup in the room. Each completed saved contribution owns one scene object and exact record ID. A phrase's first visitor brings its motif; repeats bring cups, tissue packets, orders, stools or plants on the room's surfaces. Positions remain stable as arrivals are appended. Additional contributions extend the scene without a cap. Decorative architecture never counts as a visitor. See `docs/scene-art-prompt.md` for the motif atlas brief.

`lib/mural-composition.ts` groups the complete contribution feed into `MuralPatch` objects. The gallery consumes `{patches, selectedKey?, onSelect}`. Each patch contains `key`, `phrase`, `count`, `contributionIds`, `firstCreatedAt`, `lastCreatedAt`, `firstId`, `latestId`, nullable `artwork`, fixed `meaning`, `verified`, `source`, `sourceUrl`, `palette`, and `zone`. Artwork and meaning remain tied to their saved records. Objects share a fictional scene; that placement does not establish a real linguistic relationship or change any definition.

`/wall?view=gallery` presents one card per contributed phrase with its illustration, concise meaning, zone and contribution count. Phrase/meaning search and zone filters operate locally. Selecting a scene object or gallery card opens the shared phrase inspector. Opening an inspector, browsing, pausing or replaying does not generate new artwork or writing and does not save another submission. New supported phrases continue using the existing reference check and generation flow; the 27 prepared results remain free of live AI calls.

`lib/kopitiam-scene.ts` composes surface-aware positions independently from rendering. Scene checks cover exact saved IDs, duplicate IDs, counter/table/bench contact, floor placement, stable append behavior and 650 contributions.

## Routes and storage

`POST /api/check` accepts `{phrase, allowCreative?}`. The default returns a supported canonical phrase, fixed meaning, source where available, `availability: "prepared" | "live"`, and `provenance: "collection" | "reviewed" | "discovered"`. An empty completed lookup returns HTTP 422 `UNKNOWN_PHRASE` with `canCreateOriginal: true`; plausible choices return HTTP 422 `AMBIGUOUS_PHRASE` with supported meanings and source links; an incomplete dictionary check returns HTTP 503 `REFERENCE_UNAVAILABLE` with `retryable: true`. Invalid input may also return `UNKNOWN_PHRASE`, without the creative-option flag. Only an explicit `{allowCreative: true}` request after an empty completed check accepts an original expression with `provenance: "creative"`, `verified: false`, neutral context and null source fields. The flag cannot bypass ambiguity, outages or input safety checks. Lookup can save a reference or short-lived missing-entry cache, but never generates artwork or a wall contribution.

`POST /generate` or `/api/generate` accepts `{phrase, voiceMode?, requestId?, allowCreative?}`, repeats the reference check and returns a saved thread with optional artwork. Ordinary submissions omit `allowCreative`; the original-expression button sends it to both checking and generation. Input, speech or format changes clear that pending choice; late responses cannot apply to edited input. `GET /api/thread?id=<uuid>` retrieves its full writing for the inspector or shared thread page. `GET /api/mural` returns every actual contribution in chronological order with a matching total and the lightweight fields `{id, phrase, palette, createdAt, meaning, verified, source, sourceUrl, artwork}`. Artwork is nullable. There is no 120-record cap; the entire event contributes to the scene and gallery. `GET /api/wall` remains available for the newest 120 full threads, and `GET /api/tapestry` retains its legacy lightweight `{id, phrase, palette, createdAt}` feed. `/api/artwork?id=<hash>` serves immutable saved image bytes. Existing shared threads remain readable.

`/api/status` returns the configured text model, key/binding availability and a D1 connectivity result without secrets. Its text and artwork flags do not probe provider credentials, quota or R2 connectivity.

Cloudflare D1 stores threads, phrase-level artwork metadata, and atomic limits; R2 stores generated images. Canonical phrase plus visual-style version identifies artwork. Concurrent requests share a generation lease to prevent duplicate paid image calls. The event has an atomic limit of 80 new image attempts per Singapore day; prepared and cached images bypass that budget. New threads freeze their selected artwork reference, including an explicit missing-art state. Original pre-artwork records may discover the collection. Versioned static filenames and immutable R2 keys preserve saved images.

The browser polls the wall every four seconds; projection can be paused. Mural, gallery and image cache use canonical phrase identity; obvious spelling errors and documented aliases reuse the same artwork. Uncertain suggestions remain optional. Speech requests en-SG when available, leaves the transcript editable, and always has a typing path. Browser speech may use a remote provider; the app receives no audio.

## Verification

```sh
npx tsc --noEmit
node --import tsx scripts/test-domain.ts
LOOM_TEST_URL=http://127.0.0.1:5173 node --import tsx scripts/test-domain.ts
LOOM_TEST_URL=http://127.0.0.1:5173 LOOM_CHECK_ONLY=1 node --import tsx scripts/test-domain.ts
node --import tsx scripts/test-kopitiam-scene.ts
node --import tsx scripts/test-phrase-variants.ts
npm run build
```

Backend checks cover canonical spacing variants and ambiguous collisions, exact dictionary senses, disabled/literal qualifier rejection, reference outages/caches/budgets, no client-defined meaning bypass, explicit creative provenance, null-source storage, fixed meanings, safety/refusals, provider failures before image/storage, fallbacks, lyric length, frozen artwork, real SQLite cache SQL, leases, upload races, the daily image cap, and immutable image responses. A 135-contribution fixture confirms that the collective tapestry includes older records beyond the 120-card wall gallery. Mocked-provider route tests exercise all 27 curated phrases in both formats with zero text/image requests, then confirm two dictionary-alias submissions share one illustration.

The Gemini adapter and R2 cache have live-request verification. Earlier local end-to-end checks generated writing and artwork for "your head la", confirmed "your head ah" reused that same image, and generated a separately labelled creative result for an expression without a dictionary entry. The current dictionary-first policy requires an explicit original-expression choice for that last case. `LOOM_CHECK_ONLY=1` runs HTTP checks without creating accepted threads. Event-phone microphone accuracy still needs a real device test.

## Research and design

Detailed feasibility and corpus audit: `docs/research.md` and `docs/corpus-research.json`. The event's loom/computing framing makes Culture × Tech a strong fit. The wall makes participation tangible; separate evidence and fiction is the core creative mechanism.

Mobbin references were inspected for structure: [Manus prompt entry](https://mobbin.com/screens/156621d5-5d04-427e-acd0-a20be1c8d1ca), [Skillshare typographic gallery](https://mobbin.com/screens/cf5e6cae-08db-46ff-86bf-e5bb55750c1d), [Curater art gallery](https://mobbin.com/screens/570811a7-d458-4a3b-ae87-ecb4cdeb5fac), [Savee artwork browsing](https://mobbin.com/screens/bc78f482-66c1-4cf1-b2aa-55e8e5171833), and [Cosmos visual collection](https://mobbin.com/screens/4949a661-f099-43f1-a034-9954053722e4). The visual identity is original: Bricolage Grotesque, kopitiam palette, tissue packet, linen collage and objects sharing one kopitiam.

Use GPT 6.1 Sol high/extra-high for iterative implementation; optionally ask Astra to critique the working design. Official model guidance supports that division of work. No cited source establishes a universal design winner over Opus 5.5. Model choice for app generation is independent of the model used to build the site.
