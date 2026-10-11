# Artwork comparison · 11 October 2026

Decision: use Gemini Nano Banana 2.1 for the prepared collection and live new-phrase artwork. Keep one woven editorial direction across both.

We compared blur sotong, kanchiong spider, and chope using the exact same text brief for OpenAI's built-in Imagegen tool and Gemini's API, without reference images or manual retouching. The paired originals and a comparison board are in the sibling `outputs/art-comparison` deliverable. Exact prompts are in `art-prompts.json`.

This is a small subjective design study, not a general model benchmark. The built-in Imagegen tool did not expose its underlying model identifier; these images should not be attributed to Astra or Sol. Those models help build and critique the app.

| Criterion | OpenAI built-in Imagegen | Gemini Nano Banana 2.1 |
| --- | --- | --- |
| Phrase readability | Clear metaphors, with more scene detail | Clear, spare silhouettes that remain readable as wall tiles |
| Material quality | Rich stitching, linen, crockery and floor detail | Simpler cut fabric and paper collage with convincing texture |
| Singapore setting | Stronger kopitiam surroundings and landmarks | More restrained everyday cues, closer to the sparse brief |
| Child-friendly direction | Gentle squid and an eight-armed cup, no scary insect | Gentle squid and ribbon-armed cup, no scary insect |
| Collection consistency | Cohesive, richly illustrated scenes | Cohesive, cleaner graphic compositions |
| Measured generation time | No comparable instrumented timing captured | Retained samples: 18.5s, 19.2s, 17.5s |

OpenAI's chope is particularly appealing as a framed illustration. Gemini is the better fit for this release's compact tiles and reusable API pipeline, and its restrained compositions sit comfortably beside the site's bold type. Gemini's squid is somewhat cute; future briefs can reduce facial features if a more adult register is desired. Its chope adds a stitched rectangular frame despite the no-border instruction. Neither issue makes the artwork frightening or unsuitable for this audience.

The Gemini comparison script initially used an incompatible request spelling (three HTTP 400 responses). After correction, three images were generated successfully but discarded by a PNG-only format check. We corrected the script and retained three replacement JPEG originals plus lossless PNG copies. The metadata records those attempts honestly; there were six successful Gemini comparison image generations in total. Runtime artwork supports JPEG, PNG and WebP and saves returned bytes directly.

Live adapter verified: `generateContent`, `responseModalities: ["TEXT", "IMAGE"]`, and `imageConfig: {aspectRatio: "1:1", imageSize: "1K"}`. The server saves the image once per normalized canonical phrase and style version. Repeated submissions reuse it. The key stays in runtime secrets and the configured key remains server-side.

Google references: [image-generation guide](https://ai.google.dev/gemini-api/docs/image-generation), [structured text output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). The request shape and actual access were verified with the configured key; documentation alone was not treated as proof of quota or successful output.
