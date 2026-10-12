"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Mic, Shuffle } from "lucide-react";
import { Footer, Header, HeroMosaic, WeavingCanvas } from "./loom-ui";
import { CollectiveWeavePreview } from "./collective-weave-preview";
import { ThreadReveal } from "./thread-reveal";
import type { LoomRecord, StatusResponse, VoiceMode, WallResponse, PhraseCheckResponse, UnknownPhrase } from "../lib/types";

const EXAMPLES = ["blur sotong", "steady pom pi pi", "chope", "pattern more than badminton", "shiok", "aiyo", "kanchiong spider"];
type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; onstart: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
type CheckNotice = { title: string; detail: string; meaning?: string; source?: string | null; sourceUrl?: string | null };

export function PhraseCheckFeedback({ error, busy, onChoose, onRetry, onOriginal }: {
 error: UnknownPhrase;
 busy: boolean;
 onChoose: (phrase: string) => void;
 onRetry: () => void;
 onOriginal: () => void;
}) {
 const unavailable = error.code === "REFERENCE_UNAVAILABLE";
 const ambiguous = error.code === "AMBIGUOUS_PHRASE";
 const canCreateOriginal = error.code === "UNKNOWN_PHRASE" && error.canCreateOriginal === true;
 return <div className={`phrase-check-note phrase-check-choice ${unavailable ? "reference-unavailable" : ""}`} role="status" aria-live="polite">
  <strong>{unavailable ? "The dictionary couldn’t be reached." : ambiguous ? "Which supported phrase did you mean?" : canCreateOriginal ? "We couldn’t find this phrase in our references." : error.error}</strong>
  <p>{unavailable ? "We couldn’t finish checking this expression. Try again shortly, or choose a prepared phrase." : ambiguous ? "These spellings are close. Choose the phrase that fits what you meant. Each suggestion keeps its own meaning and source." : canCreateOriginal ? "Dictionaries don’t cover every expression. Try a supported spelling below, edit your phrase, or browse the collection." : "Edit your phrase, or choose a prepared expression from the collection."}</p>
  {!unavailable && error.suggestions.length > 0 && <ul className="phrase-match-list" aria-label="Supported phrase matches">
   {error.suggestions.map(suggestion => <li key={suggestion.phrase}>
    <button type="button" disabled={busy} onClick={() => onChoose(suggestion.phrase)}><span>{suggestion.phrase}</span><ArrowUpRight size={16}/></button>
    <p>{suggestion.meaning}</p>
    {suggestion.source && <small>{suggestion.sourceUrl ? <a href={suggestion.sourceUrl} target="_blank" rel="noreferrer">{suggestion.source}</a> : suggestion.source}</small>}
   </li>)}
  </ul>}
  <div className="phrase-check-actions">
   {unavailable && <button type="button" className="check-retry" disabled={busy} onClick={onRetry}>Try the dictionary again <ArrowRight size={14}/></button>}
   <a href="/collection">Explore prepared phrases <ArrowUpRight size={14}/></a>
  </div>
  {canCreateOriginal && <div className="original-expression-choice">
   <p>Want to invent with these words? We can create an illustration and story, labelled <strong>creative interpretation · unverified</strong>. This won’t become a verified dictionary meaning.</p>
   <button type="button" disabled={busy} onClick={onOriginal}>Weave it as an original expression <ArrowUpRight size={16}/></button>
  </div>}
 </div>;
}

export function LoomApp() {
 const [checkNotice, setCheckNotice] = useState<CheckNotice | null>(null);
 const [phrase, setPhrase] = useState("");
 const [clientReady, setClientReady] = useState(false);
 const [voiceMode, setVoiceMode] = useState<VoiceMode>("story");
 const [record, setRecord] = useState<LoomRecord | null>(null);
 const [loading, setLoading] = useState(false);
 const [checking, setChecking] = useState(false);
 const [generationPath, setGenerationPath] = useState<"prepared" | "live" | null>(null);
 const [checkError, setCheckError] = useState<UnknownPhrase | null>(null);
 const [message, setMessage] = useState("");
 const [listening, setListening] = useState(false);
 const [supported, setSupported] = useState(false);
 const [status, setStatus] = useState<StatusResponse | null>(null);
 const [wall, setWall] = useState<WallResponse>({ records: [], total: 0, mode: "demo" });
 const resultRef = useRef<HTMLElement>(null);
 const inputRef = useRef<HTMLTextAreaElement>(null);
 const recognitionRef = useRef<Recognition | null>(null);
 const holdingRef = useRef(false);
 const requestEpochRef = useRef(0);
 const controllerRef = useRef<AbortController | null>(null);
 const pendingPhraseRef = useRef<string | null>(null);
 const phraseRef = useRef("");

 // Initialize browser-only speech capability and URL state after hydration.
 useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setClientReady(true);
  const w = window as RecognitionWindow;
  setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  const term = new URLSearchParams(location.search).get("term");
  if (term) { const initial = term.slice(0, 120); setPhrase(initial); phraseRef.current = initial; }
  let alive = true;
  const refresh = () => fetch("/api/wall").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { if (alive) setWall(d as WallResponse); }).catch(() => {});
  refresh();
  fetch("/api/status").then(r => r.json()).then(d => { if (alive) setStatus(d as StatusResponse); }).catch(() => {});
  const timer = setInterval(refresh, 5000);
  const stop = () => { holdingRef.current = false; recognitionRef.current?.stop(); };
  const requestEpoch = requestEpochRef;
  const activeController = controllerRef;
  window.addEventListener("blur", stop);
  return () => { alive = false; clearInterval(timer); window.removeEventListener("blur", stop); recognitionRef.current?.abort(); requestEpoch.current++; activeController.current?.abort(); };
 }, []);

 function resetCheck() {
  requestEpochRef.current++;
  controllerRef.current?.abort();
  controllerRef.current = null;
  pendingPhraseRef.current = null;
  setLoading(false); setChecking(false); setGenerationPath(null);
  setCheckError(null); setCheckNotice(null); setMessage("");
 }
 function updatePhrase(next: string) {
  resetCheck(); phraseRef.current = next; setPhrase(next);
 }
 function changeFormat(next: VoiceMode) {
  if (next === voiceMode) return;
  resetCheck(); setVoiceMode(next);
 }
 function startSpeech() {
  if (loading || listening) return;
  resetCheck();
  const w = window as RecognitionWindow;
  const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Constructor) { setMessage("This browser doesn’t support speech recognition. Type a phrase above."); return; }
  holdingRef.current = true;
  const rec: Recognition = new Constructor();
  recognitionRef.current = rec; rec.lang = "en-SG"; rec.continuous = false; rec.interimResults = true;
  rec.onstart = () => { if (!holdingRef.current) { rec.stop(); return; } setListening(true); setMessage("Listening… release when you’re done. You can edit the transcript."); };
  rec.onresult = e => { const transcript = Array.from(e.results).map(r => r[0]?.transcript || "").join(" "); updatePhrase(transcript.slice(0, 120)); };
  rec.onerror = e => { setListening(false); setMessage(e.error === "not-allowed" ? "Microphone access was declined. Type your phrase, or allow microphone access and try again." : "Couldn’t hear that clearly. Try again or type your phrase."); };
  rec.onend = () => { setListening(false); holdingRef.current = false; recognitionRef.current = null; };
  try { rec.start(); } catch { setMessage("Speech recognition couldn’t start. Type your phrase instead."); holdingRef.current = false; }
 }
 function stopSpeech() { holdingRef.current = false; recognitionRef.current?.stop(); }

 async function generate(e?: React.FormEvent, allowCreative = false) {
  e?.preventDefault();
  if (loading || !clientReady || controllerRef.current) return;
  // A creative choice is bound to the checked input, never a later edit.
  if (allowCreative && (checkError?.code !== "UNKNOWN_PHRASE" || !checkError.canCreateOriginal || pendingPhraseRef.current !== phraseRef.current)) return;
  stopSpeech();
  const submittedPhrase = phraseRef.current;
  const submittedMode = voiceMode;
  if (submittedPhrase.trim().length < 2) { setMessage("Give us a phrase of at least two characters, lah."); inputRef.current?.focus(); return; }
  const epoch = ++requestEpochRef.current;
  const isCurrent = () => requestEpochRef.current === epoch;
  pendingPhraseRef.current = null;
  setLoading(true); setChecking(true); setGenerationPath(null); setCheckError(null); setCheckNotice(null); setRecord(null);
  setMessage(allowCreative ? "Checking your original-expression choice…" : "Checking familiar spellings and looking for a published meaning…");
  const controller = new AbortController();
  controllerRef.current = controller;
  const timeout = setTimeout(() => controller.abort(), 135000);
  try {
   const choice = allowCreative ? { allowCreative: true } : {};
   const check = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phrase: submittedPhrase, ...choice }), signal: controller.signal });
   const checked = await check.json() as PhraseCheckResponse & { error?: string };
   if (!isCurrent()) return;
   if (!check.ok || !checked.accepted) {
    if ("code" in checked && (checked.code === "UNKNOWN_PHRASE" || checked.code === "AMBIGUOUS_PHRASE" || checked.code === "REFERENCE_UNAVAILABLE")) { setCheckError(checked); pendingPhraseRef.current = submittedPhrase; }
    throw new Error(checked.error || "Couldn’t check that phrase. Please try again.");
   }
   if (checked.provenance === "creative") {
    setCheckNotice({ title: "Your original expression, clearly labelled.", detail: "You chose to create without a confirmed dictionary meaning. Its illustration and story will stay marked creative interpretation · unverified." });
   } else {
    const variant = checked.submittedPhrase && checked.resolution !== "exact" && checked.phrase !== checked.submittedPhrase;
    setCheckNotice({
     title: `Matched “${checked.phrase}”.`,
     detail: variant ? `“${checked.submittedPhrase}” joins this same phrase. Variants share artwork and a gallery entry.` : checked.source ? "Its meaning comes from the reference below. The illustration and story are creative." : "This phrase is in the prepared collection. Its meaning stays labelled unverified draft.",
     meaning: checked.meaning, source: checked.source, sourceUrl: checked.sourceUrl,
    });
   }
   const generationPhrase = checked.provenance === "creative" ? submittedPhrase : checked.phrase;
   if (checked.provenance !== "creative") { phraseRef.current = checked.phrase; setPhrase(checked.phrase); }
   setChecking(false); setGenerationPath(checked.availability === "prepared" ? "prepared" : "live");
   setMessage(checked.availability === "prepared" ? "Your prepared artwork and writing are ready to weave." : checked.provenance === "creative" ? "Weaving your original expression into an illustration and story. A new image can take about a minute." : "A published meaning is ready. We’re making the story and illustration; a new image can take about a minute.");
   const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phrase: generationPhrase, voiceMode: submittedMode, requestId: crypto.randomUUID(), ...choice }), signal: controller.signal });
   const data = await res.json() as LoomRecord & { error?: string; code?: string };
   if (!isCurrent()) return;
   if (!res.ok) {
    if (data.code === "UNKNOWN_PHRASE" || data.code === "AMBIGUOUS_PHRASE" || data.code === "REFERENCE_UNAVAILABLE") { setCheckNotice(null); setCheckError(data as unknown as UnknownPhrase); pendingPhraseRef.current = generationPhrase; }
    throw new Error(data.error || "Couldn’t weave that phrase. Try again.");
   }
   phraseRef.current = data.phrase; setPhrase(data.phrase);
   setRecord(data); setMessage(data.mode === "prepared" ? "Your prepared artwork is weaving into view. Replay it any time." : data.mode === "demo" ? "Ready — prepared writing; live writing was unavailable." : "Your thread is ready.");
   fetch("/api/wall").then(r => { if (!r.ok) throw new Error("Wall refresh unavailable"); return r.json(); }).then(d => { const data = d as Partial<WallResponse> | null; if (isCurrent() && data && Array.isArray(data.records) && typeof data.total === "number") setWall(data as WallResponse); }).catch(() => {});
   setTimeout(() => { if (isCurrent()) resultRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); }, 80);
  } catch (err) {
   if (isCurrent()) setMessage(err instanceof Error && err.name !== "AbortError" ? err.message : "The loom took too long. Try a prepared phrase such as blur sotong or chope.");
  } finally {
   clearTimeout(timeout);
   if (isCurrent()) { controllerRef.current = null; setLoading(false); setChecking(false); }
  }
 }

 function chooseSuggestion(next: string) {
  updatePhrase(next); setMessage("Phrase selected. Weave it when you’re ready."); inputRef.current?.focus();
 }
 function surprise() {
  const next = EXAMPLES.filter(p => p !== phrase); updatePhrase(next[Math.floor(Math.random() * next.length)]); inputRef.current?.focus();
 }

 return <><Header/><main>
  <section className="hero page-width"><div className="hero-copy">
   <div className="eyebrow"><span className="tiny-weave"/> A LIVING PICTURE OF SINGLISH</div>
   <h1>Small words.<br/>Big Singapore<br/><span className="energy">energy<span className="spark">✳</span></span></h1>
   <p className="hero-description">Some things just sound better in Singlish.<br/>Give us a phrase. We’ll weave a picture, a story, and a place in our shared kopitiam.</p>
   <form className="intake" onSubmit={e => { void generate(e); }}>
    <label htmlFor="phrase">What’s your Singlish?</label>
    <textarea ref={inputRef} id="phrase" maxLength={120} rows={2} placeholder="E.g. blur sotong, confirm plus chop…" value={phrase} onChange={e => updatePhrase(e.target.value)} disabled={loading || !clientReady} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void generate(); } }}/>
    <div className="intake-actions">
     <button type="button" className={`mic-button ${listening ? "listening" : ""}`} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); startSpeech(); }} onPointerUp={stopSpeech} onPointerCancel={stopSpeech} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startSpeech(); } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); stopSpeech(); } }} disabled={loading || !clientReady} aria-pressed={listening} aria-label={supported ? "Hold to speak a Singlish phrase" : "Speech recognition unavailable; type a phrase"}><Mic size={17}/><span>{listening ? "Listening…" : "Hold to speak"}</span></button>
     <button className="weave-button" disabled={loading || !clientReady} type="submit">{loading ? (checking ? "Checking…" : "Weaving…") : "Weave my phrase"}<ArrowUpRight size={18}/></button>
    </div>
    <div className="format-row"><span>Give it a voice:</span><div role="group" aria-label="Creative format"><button type="button" className={voiceMode === "story" ? "selected" : ""} onClick={() => changeFormat("story")} disabled={loading || !clientReady}>A little story</button><button type="button" className={voiceMode === "lyric" ? "selected" : ""} onClick={() => changeFormat("lyric")} disabled={loading || !clientReady}>Four-line lyric</button></div></div>
   </form>
   <div className="live-examples"><span>OR TRY A DICTIONARY PHRASE</span>{["your head ah", "lepak", "sabo"].map(p => <button key={p} type="button" disabled={loading || !clientReady} onClick={() => { updatePhrase(p); setMessage("We’ll check its meaning, then weave a picture and story."); inputRef.current?.focus(); }}>{p} ↗</button>)}</div>
   {loading && <div className="weave-progress" aria-label="Weaving progress"><span className={checking ? "is-current" : "is-done"}><b>{checking ? "1" : "✓"}</b> Find the phrase</span><span className={!checking ? "is-current" : ""}><b>2</b> {generationPath === "prepared" ? "Open the artwork" : "Make the artwork"}</span><span><b>3</b> Join the mural</span></div>}
   <p className={`form-message ${listening ? "recording" : ""}`} role="status" aria-live="polite">{message || "Your phrase will join the public wall. Keep it kind, lah."}</p>
   {checkNotice && <div className="phrase-check-note" role="note"><strong>{checkNotice.title}</strong><p>{checkNotice.detail}</p>{checkNotice.meaning && <p className="matched-meaning">{checkNotice.meaning}</p>}{checkNotice.source && <p className="matched-source">Source: {checkNotice.sourceUrl ? <a href={checkNotice.sourceUrl} target="_blank" rel="noreferrer">{checkNotice.source}</a> : checkNotice.source}</p>}</div>}
   {checkError && <PhraseCheckFeedback error={checkError} busy={loading || !clientReady} onChoose={chooseSuggestion} onRetry={() => { void generate(); }} onOriginal={() => { void generate(undefined, true); }}/>}
   <div className="try-row"><span>OR TRY</span>{["blur sotong", "chope", "kanchiong spider"].map(p => <button key={p} onClick={() => { updatePhrase(p); inputRef.current?.focus(); }} disabled={loading || !clientReady}>{p}<span>↗</span></button>)}<button className="surprise" onClick={surprise} disabled={loading || !clientReady} aria-label="Surprise me with a phrase"><Shuffle size={15}/></button></div>
   <p className="speech-note">27 phrases are ready to reveal. We check new spellings against our references first. If no supported match is found, you can choose an original, clearly unverified expression. Speech uses your browser’s recognition service; review its transcript.</p>
   <a className="collection-link" href="/collection">Browse all 27 prepared phrases <ArrowUpRight size={14}/></a>
  </div>{loading ? <WeavingCanvas checking={checking}/> : <HeroMosaic/>}</section>
  <div className="promise-strip"><span><span>✓</span> Meanings checked. Imagination labelled.</span><span><span>✳</span> Myths, with their imagination</span><span><span>↗</span> A little piece of us, to keep</span></div>
  {record && <section className="result-section page-width" ref={resultRef}><div className="section-heading"><div><div className="eyebrow">YOUR WORDS, WOVEN INTO THE ROOM</div><h2>{record.phrase}<span className="title-star">✳</span></h2></div><span className="mode-label">{record.mode === "prepared" ? "PREPARED COLLECTION" : record.mode === "demo" ? "PREPARED FALLBACK" : "AI WOVEN"}</span></div><ThreadReveal key={record.id} record={record}/></section>}
  <section className="wall-preview page-width"><div className="section-heading"><div><div className="eyebrow"><span className="live-dot"/> THE LIVING KOPITIAM</div><h2>Everybody brings<br/>a little <em>something.</em></h2></div><div className="wall-preview-side"><p>{wall.total === 0 ? "The first thread could be yours." : `${wall.total} ${wall.total === 1 ? "thread" : "threads"} and counting.`}<br/>One room. Many ways to say it.</p><a href="/wall" className="text-link">Step into the living mural <ArrowUpRight size={18}/></a></div></div><CollectiveWeavePreview/><div className="wall-preview-foot"><p>{wall.total ? "A new phrase brings a character or object. Every visitor adds something to the room." : "The first phrase brings an object into our kopitiam."}</p><span>{status === null ? "CHECKING THE LOOM…" : status.llm ? "27 PREPARED · LIVE AI FOR NEW PHRASES" : "27 PREPARED PHRASES"}</span></div></section>
  <section className="manifesto page-width"><div className="manifesto-mark"><div className="weave-square" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <i key={i}/>)}</div></div><div><div className="eyebrow">NOT BROKEN ENGLISH. A SHARED LANGUAGE.</div><h2>Borrowed words.<br/>Belonging, woven in.</h2></div><p>Malay, Hokkien, Cantonese, Tamil, English, and the lives between them. Singlish carries the everyday ways we connect. This is a small celebration of that.<a href="/about">Meet the threads <ArrowRight size={17}/></a></p></section>
 </main><Footer/></>;
}
