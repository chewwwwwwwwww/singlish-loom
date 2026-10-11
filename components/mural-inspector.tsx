"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors retain Vinext compatibility. */
/* eslint-disable react-hooks/set-state-in-effect -- A selected saved contribution is fetched after the dialog opens. */
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { LoomRecord } from "../lib/types";
import type { MuralPatch } from "../lib/mural-composition";
import { ArtworkImage, artworkLabel } from "./artwork-view";
import { ResultCard } from "./loom-ui";

export function MuralInspector({ patch, initialId, onClose }: { patch: MuralPatch; initialId?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [id, setId] = useState(initialId && patch.contributionIds.includes(initialId) ? initialId : patch.latestId);
  const [record, setRecord] = useState<LoomRecord | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setRecord(null); setError(false);
    fetch(`/api/thread?id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Thread unavailable");
        const result = await response.json() as LoomRecord;
        if (result.id !== id || typeof result.meaning !== "string" || typeof result.myth !== "string" || typeof result.voice !== "string") throw new Error("Incomplete thread");
        return result;
      }).then(result => { if (active) setRecord(result); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; controller.abort(); };
  }, [id, retry]);
  return <dialog ref={dialog} className="mural-inspector" aria-labelledby="mural-inspector-title" onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="mural-inspector-body">
      <div className="mural-inspector-heading"><div><span className="eyebrow">A PHRASE IN OUR KOPITIAM</span><h2 id="mural-inspector-title">{patch.phrase}</h2><p>{patch.count} {patch.count === 1 ? "person has" : "people have"} brought this phrase to the room.</p></div><button className="mural-close" onClick={onClose} aria-label="Close phrase details" autoFocus><X size={21}/></button></div>
      <div className="mural-inspector-intro">
        {patch.artwork ? <ArtworkImage url={patch.artwork.url} alt={patch.artwork.alt} loading="eager"/> : <div className="mural-inspector-no-art">This contribution has its words and story. Its illustration is unavailable.</div>}
        <div><span className="eyebrow">ONE ROOM, MANY VOICES</span><h3>Someone brought<br/>this to the room.</h3><p>The original illustration belongs to this phrase. Every person who chooses it adds a character or object to our shared kopitiam.</p><label htmlFor="mural-contribution">Explore a saved contribution</label><select id="mural-contribution" value={id} onChange={event => setId(event.target.value)}>{patch.contributionIds.map((contributionId, index) => <option key={contributionId} value={contributionId}>Contribution {index + 1}{contributionId === patch.latestId ? " · latest" : ""}</option>)}</select>{patch.artwork && <small>{artworkLabel(patch.artwork)}. Illustration is imagination.</small>}<a className="text-link" href={`/thread/${id}`}>Open its poster & shareable page <ArrowUpRight size={15}/></a></div>
      </div>
      {record ? <ResultCard record={record}/> : <div className="mural-inspector-loading" role="status"><p>{error ? "This saved story couldn’t load. Its place in the scene is still here." : "Opening the meaning, myth and voice…"}</p>{error && <button className="outline-button" onClick={() => setRetry(value => value + 1)}>Try again</button>}</div>}
    </div>
  </dialog>;
}
