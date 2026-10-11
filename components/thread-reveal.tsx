"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors retain Vinext compatibility. */
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, RotateCcw, SkipForward } from "lucide-react";
import { ArtworkView } from "./artwork-view";
import { LoomMark, ResultCard } from "./loom-ui";
import { Poster } from "./poster";
import type { LoomRecord } from "../lib/types";

const COLORS = ["#e3eba4", "#dd6040", "#c9d9ec", "#d2c3e4", "#efca75", "#b4d3c0"];
const DURATION = 3400;

export function ThreadReveal({record}: {record: LoomRecord}) {
  const [run, setRun] = useState(0);
  const [settled, setSettled] = useState(!record.artwork);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const imageSettled = useCallback(() => setSettled(true), []);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(preference.matches); if (preference.matches) setPlaying(false); };
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!settled || !playing || reduced) return;
    const timer = setTimeout(() => setPlaying(false), DURATION);
    return () => clearTimeout(timer);
  }, [settled, playing, reduced, run]);
  // A slow or broken illustration never leaves the writing waiting behind motion.
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 5000);
    return () => clearTimeout(timer);
  }, []);
  const active = playing && settled && !reduced;
  const replay = () => { setRun(value => value + 1); setPlaying(true); };
  const color = COLORS[record.palette % COLORS.length];
  const decoration = <div className="reveal-textile" aria-hidden="true">
    <div className="reveal-warp">{Array.from({length:22}, (_, i) => <i key={i} style={{"--warp-index":i} as CSSProperties}/>)}</div>
    <div className="reveal-weft">{Array.from({length:18}, (_, i) => <i key={i} style={{"--weft-index":i} as CSSProperties}><span/></i>)}</div>
    <div className="reveal-shuttle"><span/><i/></div>
    <div className="reveal-phrase"><span>{record.phrase}</span><small>ONE MORE VOICE IN OUR LIVING KOPITIAM</small></div>
  </div>;
  return <div className={`thread-reveal ${active ? "is-weaving" : !settled && playing ? "is-waiting" : "is-complete"}`} style={{"--thread-color":color} as CSSProperties} data-reveal-run={run}>
    <div className="reveal-toolbar">
      <div><LoomMark/><p><strong>{active ? "Your words, taking shape." : "Your thread is part of the room."}</strong><span>{active ? "The shuttle lays your colours into the cloth." : record.mode === "prepared" ? "Prepared artwork. A fresh weave, every time." : "An imagined scene, ready to share."}</span></p></div>
      {active || (!settled && playing) ? <button className="outline-button" onClick={() => setPlaying(false)}><SkipForward size={13}/> Skip reveal</button> : <button className="outline-button" onClick={replay} disabled={reduced}><RotateCcw size={13}/> Replay weave</button>}
    </div>
    <div key={`${record.id}-${run}`} className="reveal-content">
      <ArtworkView record={record} reveal={false} decoration={decoration} onSettled={imageSettled}/>
      <ResultCard record={record}/>
    </div>
    <div className="thread-joined"><span className="thread-joined-mark"><LoomMark/></span><div><strong>Your phrase has a place here.</strong><p>Your contribution adds a character or object to our shared kopitiam. Familiar phrases bring another cup, order or seat.</p></div><a href={`/wall?thread=${encodeURIComponent(record.id)}`} className="text-link">Find my contribution <ArrowUpRight size={16}/></a></div>
    <Poster record={record}/>
  </div>;
}
