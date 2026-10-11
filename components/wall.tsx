"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors retain Vinext compatibility. */
/* eslint-disable react-hooks/set-state-in-effect -- Restore view and saved contribution from the URL after hydration. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Grid2X2, Maximize2, Minimize2, Pause, Play, RotateCcw, Spool, SkipForward } from "lucide-react";
import { Footer, Header } from "./loom-ui";
import { KopitiamMural, type MuralArrival } from "./kopitiam-mural";
import { MuralGallery } from "./mural-gallery";
import { MuralInspector } from "./mural-inspector";
import { MuralStage } from "./mural-stage";
import { useMuralFeed } from "./use-mural-feed";
import { groupMuralContributions, type MuralPatch } from "../lib/mural-composition";

type Arrival = MuralArrival;

export function Wall() {
  const [paused, setPaused] = useState(false);
  const [projector, setProjector] = useState(false);
  const [fitProjection, setFitProjection] = useState(true);
  const [view, setView] = useState<"mural" | "gallery">("mural");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedContributionId, setSelectedContributionId] = useState("");
  const [inspectedKey, setInspectedKey] = useState("");
  const [requestedId, setRequestedId] = useState("");
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [arrivalMessage, setArrivalMessage] = useState("");
  const [replayToken, setReplayToken] = useState(0);
  const [locateKey, setLocateKey] = useState("");
  const observedIds = useRef<Set<string> | null>(null);
  const knownPhrases = useRef(new Set<string>());
  const arrivalToken = useRef(0);
  const { data, loaded, error } = useMuralFeed(paused);
  const patches = useMemo(() => groupMuralContributions(data.records), [data.records]);
  const selected = patches.find(patch => patch.key === selectedKey);
  const inspected = patches.find(patch => patch.key === inspectedKey);
  useEffect(() => {
    const parameters = new URLSearchParams(location.search);
    setProjector(parameters.get("project") === "1");
    setView(parameters.get("view") === "gallery" ? "gallery" : "mural");
    setRequestedId(parameters.get("thread") || "");
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(data.records.map(record => record.id));
    const newRecords = observedIds.current === null ? [] : data.records.filter(record => !observedIds.current!.has(record.id));
    const requested = requestedId ? patches.find(patch => patch.contributionIds.includes(requestedId)) : undefined;
    if (requested) {
      const first = requestedId === requested.firstId;
      setSelectedKey(requested.key); setSelectedContributionId(requestedId); setLocateKey(requestedId); setRequestedId("");
      setArrival({ key: requested.key, token: ++arrivalToken.current, kind: first ? "new" : "repeat", contributionId: requestedId });
      setArrivalMessage(`Your contribution is here: ${requested.phrase}. ${first ? "You brought this phrase into the kopitiam." : "You added another object to its part of the room."}`);
    } else if (newRecords.length) {
      const latest = newRecords[newRecords.length - 1];
      const changed = patches.find(patch => patch.contributionIds.includes(latest.id));
      if (changed) {
        const kind = knownPhrases.current.has(changed.key) ? "repeat" : "new";
        setSelectedKey(changed.key); setSelectedContributionId(latest.id); setLocateKey(latest.id);
        setArrival({ key: changed.key, token: ++arrivalToken.current, kind, contributionId: latest.id });
        setArrivalMessage(`${kind === "new" ? "A new character or object joins the room for" : "Another visitor adds something for"} “${changed.phrase}”. ${newRecords.length > 1 ? `${newRecords.length} new voices joined the room.` : `${changed.count} people have shared this phrase.`}`);
      }
    } else if (!selectedKey && patches.length) {
      const latest = patches.reduce((a, b) => a.lastCreatedAt > b.lastCreatedAt ? a : b);
      setSelectedKey(latest.key); setSelectedContributionId(latest.latestId);
    }
    observedIds.current = ids;
    knownPhrases.current = new Set(patches.map(patch => patch.key));
  }, [loaded, data.records, patches, requestedId, selectedKey]);
  useEffect(() => {
    if (!arrival || paused) return;
    const timer = setTimeout(() => setArrival(null), 4800);
    return () => clearTimeout(timer);
  }, [arrival, paused]);
  useEffect(() => {
    if (!locateKey || view !== "mural" || inspectedKey) return;
    const patch = Array.from(document.querySelectorAll<HTMLElement>("[data-scene-contribution]")).find(element => element.dataset.sceneContribution === locateKey);
    if (patch) {
      const bounds = patch.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > innerHeight || bounds.left < 0 || bounds.right > innerWidth) patch.scrollIntoView({ block: "center", inline: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    setLocateKey("");
  }, [locateKey, view, inspectedKey, patches]);
  function updateUrl(nextView: "mural" | "gallery", nextProjector: boolean) {
    const parameters = new URLSearchParams(location.search);
    if (nextView === "gallery") parameters.set("view", "gallery"); else parameters.delete("view");
    if (nextProjector) parameters.set("project", "1"); else parameters.delete("project");
    history.replaceState(null, "", `/wall${parameters.size ? `?${parameters}` : ""}`);
  }
  function changeView(next: "mural" | "gallery") { setView(next); updateUrl(next, projector); }
  function selectPatch(patch: MuralPatch, contributionId?: string) {
    const id = contributionId && patch.contributionIds.includes(contributionId) ? contributionId : patch.key === selectedKey && patch.contributionIds.includes(selectedContributionId) ? selectedContributionId : patch.latestId;
    setSelectedKey(patch.key); setSelectedContributionId(id); setInspectedKey(patch.key);
  }
  function closeInspector() {
    const key = inspectedKey;
    setInspectedKey("");
    requestAnimationFrame(() => {
      const selector = view === "gallery" ? "[data-gallery-phrase]" : "[data-scene-contribution]";
      const element = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(item => item.getAttribute(view === "gallery" ? "data-gallery-phrase" : "data-scene-contribution") === (view === "gallery" ? key : selectedContributionId));
      const target = view === "gallery" ? element?.querySelector<HTMLButtonElement>("button") : element;
      target?.focus({ preventScroll: true });
    });
  }
  return <div className={`mural-wall${projector ? " is-projecting" : ""}`}>
    <Header active="wall"/>
    <main className="mural-page page-width">
      <div className="mural-heading"><div><div className="eyebrow"><span className="live-dot"/> THE LIVING KOPITIAM</div><h1>Our words. <em>One kopitiam.</em></h1><p>Every visitor brings something. Watch the room come to life.</p></div><div className="mural-count" aria-live="polite"><strong>{String(data.total).padStart(3, "0")}</strong><span>VOICES · {patches.length} {patches.length === 1 ? "PHRASE" : "PHRASES"}</span></div></div>
      <div className="mural-toolbar"><div className="mural-view-switch" role="group" aria-label="Wall view"><button aria-pressed={view === "mural"} onClick={() => changeView("mural")}><Spool size={16}/> Living mural</button><button aria-pressed={view === "gallery"} onClick={() => changeView("gallery")}><Grid2X2 size={16}/> Phrase gallery</button></div><div className="mural-tools"><span className={`live-dot${paused ? " is-paused" : ""}`}/><small>{paused ? "Mural & arrivals paused" : error ? "Reconnecting…" : loaded ? "New voices join live" : "Opening the kopitiam…"}</small><button className="outline-button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={13}/> : <Pause size={13}/>} {paused ? "Resume" : "Pause"}</button>{view === "mural" && <button className="outline-button" disabled={!patches.length} onClick={() => { setArrival(null); setReplayToken(value => value + 1); }}><RotateCcw size={13}/> Replay arrivals</button>}<button className="outline-button" aria-pressed={projector} onClick={() => { const next = !projector; setProjector(next); updateUrl(view, next); }}>{projector ? <Minimize2 size={14}/> : <Maximize2 size={14}/>} {projector ? "Exit projection" : "Project"}</button></div></div>
      {error && <p className="mural-error" role="status">The kopitiam is reconnecting. Its last complete picture stays here.</p>}
      <div className={`mural-arrival-note${arrival ? " is-active" : ""}`} role="status" aria-live="polite"><span aria-hidden="true">✳</span><p>{arrivalMessage || (loaded ? "A first phrase brings a character or object. Every repeat adds another detail. Choose something in the room to explore its phrase." : "Gathering the room’s illustrations…")}</p>{arrival && <button onClick={() => setArrival(null)}><SkipForward size={12}/> Skip arrival</button>}</div>
      {projector && view === "mural" && <button className="mural-fit-button" aria-pressed={fitProjection} onClick={() => setFitProjection(value => !value)}>{fitProjection ? "View at full size" : "Fit whole mural"} <Maximize2 size={12}/></button>}
      {loaded ? view === "mural" ? <MuralStage fit={projector && fitProjection}><KopitiamMural patches={patches} selectedKey={selectedKey} selectedId={selectedContributionId} onSelect={selectPatch} arrival={arrival} replayToken={replayToken} paused={paused}/></MuralStage> : <MuralGallery patches={patches} selectedKey={selectedKey} onSelect={selectPatch}/> : <div className="mural-loading" role="status">{error ? "The mural couldn’t load yet. We’ll keep trying." : "Unfolding our kopitiam…"}</div>}
      <div className="mural-bottom"><p>{data.total} real {data.total === 1 ? "contribution" : "contributions"} · {patches.length} distinct {patches.length === 1 ? "phrase" : "phrases"}. Every contribution is an object in this shared scene.</p><a href="/" className="text-link">Bring a phrase to the room <ArrowUpRight size={16}/></a></div>
      {selected && !inspected && <div className="mural-selected-note"><span>IN THE PICTURE</span><strong>{selected.phrase}</strong><span>{selected.count} {selected.count === 1 ? "voice" : "voices"}</span><button className="text-link" onClick={() => setInspectedKey(selected.key)}>Explore this phrase <ArrowUpRight size={15}/></button></div>}
      <div className="mural-explanation"><div><span className="eyebrow">MADE BY THE PEOPLE IN THIS ROOM</span><h2>One room.<br/>Everybody adds to it.</h2></div><p>A new phrase brings a character or object to the counter, tables or street. Someone else choosing it adds a cup, order, place setting or seat nearby. Explore the gallery for the original illustrations, meanings and imagined stories.</p><a href="/collection" className="outline-button">Choose a prepared phrase <ArrowUpRight size={15}/></a></div>
    </main>
    <Footer/>
    {inspected && <MuralInspector key={inspected.key} patch={inspected} initialId={selectedContributionId} onClose={closeInspector}/>}
  </div>;
}
