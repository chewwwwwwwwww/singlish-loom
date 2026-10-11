"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors avoid Vinext preview hydration conflicts. */

import { useEffect, useRef } from "react";
import { ArrowUpRight, MoveUpRight } from "lucide-react";
import type { LoomRecord } from "../lib/types";
import { matchCorpus } from "../lib/corpus";
import { STUDIO_ART } from "../lib/studio-art";
import { ArtworkImage, artworkLabel } from "./artwork-view";
import { DICTIONARY_LICENSE, hasDictionaryMeaning } from "../lib/meaning-attribution";

export function LoomMark({ className = "" }: { className?: string }) {
  return <svg className={className} width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M5 2v30M13 2v30M21 2v30M29 2v30M2 5h30M2 13h30M2 21h30M2 29h30" stroke="currentColor" strokeWidth="3"/><path d="M13 3v8M21 15v8M5 23v8M29 7v8" stroke="var(--paper)" strokeWidth="4"/></svg>;
}

export function Header({ active = "create" }: { active?: "create" | "wall" | "about" }) {
  return <header className="header"><a className="brand" href="/" aria-label="Singlish Loom home"><LoomMark/><span>singlish loom<span className="brand-dot">.</span></span></a><nav aria-label="Main navigation"><a className={active === "create" ? "active" : ""} href="/">The loom</a><a className={active === "wall" ? "active" : ""} href="/wall">Kopitiam mural <ArrowUpRight size={14}/></a><a className={active === "about" ? "active" : ""} href="/about">Our threads</a></nav><span className="header-tag"><span/> MADE OF MANY VOICES</span></header>;
}

export function Footer() {
  return <footer className="footer"><a className="brand small" href="/"><LoomMark/> singlish loom.</a><p>Many languages. One very Singaporean voice.</p><a href="/about">The meaning behind the making <ArrowUpRight size={14}/></a></footer>;
}

export const SAMPLE_TILES = [{ phrase: "blur sotong", palette: 0 }, { phrase: "kanchiong spider", palette: 1 }, { phrase: "chope", palette: 2 }, { phrase: "shiok", palette: 3 }, { phrase: "can is can", palette: 4 }, { phrase: "aiyo", palette: 5 }];

export function Tile({ phrase, palette = 0, id, index = 0, sample = false, artwork }: {
  phrase: string; palette?: number; id?: string; index?: number; sample?: boolean; artwork?: LoomRecord["artwork"];
}) {
  const studio = sample ? STUDIO_ART[phrase] : undefined;
  const art = artwork || (studio ? { ...studio, provider: "studio" as const, cached: true } : null);
  const content = <><div className="tile-top"><span>{sample ? "STUDIO SAMPLE" : `THREAD ${String(index + 1).padStart(3, "0")}`}</span><MoveUpRight size={17}/></div>{art && <div className="tile-artwork"><ArtworkImage key={art.url} url={art.url} alt={art.alt}/></div>}<div className="tile-word">{phrase}<span>!</span></div>{!art && <div className={`tile-pattern pattern-${palette % 4}`} aria-hidden="true"/>}<div className="tile-bottom"><span className="tile-art-label">{art ? artworkLabel(art) : "SINGLISH, WOVEN TOGETHER"}</span><span aria-hidden="true">✳</span></div></>;
  const className = `tile tile-${palette % 6}${art ? " tile-illustrated" : ""}`;
  return id ? <a href={`/thread/${id}`} className={className}>{content}</a> : <div className={className}>{content}</div>;
}

export function HeroMosaic() {
  const samples = [{ phrase: "blur sotong", className: "art-sample-main", note: "A LITTLE LOST. VERY LOCAL." }, { phrase: "kanchiong spider", className: "art-sample-kopi", note: "TOO MANY THINGS. ONE LITTLE CUP." }, { phrase: "chope", className: "art-sample-chope", note: "SEAT TAKEN, LAH." }];
  return <div className="hero-art illustrated-hero" aria-label="Three illustrations from our Singlish studio collection"><div className="art-label"><span className="live-dot"/> WORDS YOU CAN SEE. STORIES YOU CAN KEEP.</div>{samples.map(sample => <figure className={`art-sample ${sample.className}`} key={sample.phrase}>{STUDIO_ART[sample.phrase] ? <ArtworkImage url={STUDIO_ART[sample.phrase].url} alt={STUDIO_ART[sample.phrase].alt} loading="eager"/> : <div className="sample-art-pending">{sample.phrase}</div>}<figcaption><span>{sample.phrase}</span><small>{sample.note}</small></figcaption></figure>)}<div className="art-collection-note"><span>✳</span><p>Three threads from<br/>our studio collection.</p></div></div>;
}

export function WeavingCanvas({ checking = false }: { checking?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const colors = ["#174e45", "#e56a43", "#e2eaa1", "#cabfe5", "#ecc773"];
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.scale(dpr, dpr);
      const w = rect.width, h = rect.height;
      ctx.fillStyle = "#f0eddf"; ctx.fillRect(0, 0, w, h);
      const t = reduce ? 5 : (now - start) / 1000;
      const count = Math.floor(t * 9) % 34;
      for (let x = 0; x < 34; x++) { ctx.strokeStyle = colors[x % 5]; ctx.globalAlpha = .22; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x * w / 33, 0); ctx.lineTo(x * w / 33, h); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (let y = 0; y <= count; y++) {
        const yy = y * h / 34;
        ctx.strokeStyle = colors[y % 5]; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(y === count ? Math.min(w, (t * 9 % 1) * w) : w, yy); ctx.stroke();
        for (let x = 0; x < 34; x++) if ((x + y) % 2 === 0) { ctx.fillStyle = colors[x % 5]; ctx.fillRect(x * w / 33 - 4, yy - 6, 8, 12); }
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="weaving-stage"><canvas ref={ref} aria-hidden="true"/><div className="weaving-caption"><LoomMark/><h2>{checking?<>A quick check.<br/>Room for your words.</>:<>A little patience.<br/>A lot of possibility.</>}</h2><p>{checking?<>Looking for a familiar phrase or published meaning.<br/>New expressions can become creative interpretations.</>:<>Your illustration and story are coming together.<br/>A first-time image can take about a minute.</>}</p><span className="weaving-dots" aria-hidden="true">● ● ●</span></div></div>;
}

// Older saved threads do not carry provenance. Their immutable phrase and
// source still distinguish a visitor expression from a prepared draft.
export function isCreativeInterpretation(record: Pick<LoomRecord, "phrase" | "verified" | "source" | "sourceUrl"> & { provenance?: LoomRecord["provenance"] }) {
  return record.provenance === "creative" || (!record.verified && !record.source && !record.sourceUrl && !matchCorpus(record.phrase));
}

export function meaningBadgeLabel({ verified, dictionary = false, creative = false }: { verified: boolean; dictionary?: boolean; creative?: boolean }) {
  return dictionary ? "DICTIONARY-BACKED MEANING" : verified ? "VERIFIED MEANING" : creative ? "CREATIVE INTERPRETATION · UNVERIFIED" : "UNVERIFIED DRAFT";
}

export function MeaningBadge({ verified, dictionary = false, creative = false }: { verified: boolean; dictionary?: boolean; creative?: boolean }) {
  return <span className={`stamp ${verified ? "verified" : "draft"}`}>{dictionary || verified ? "✓ " : "○ "}{meaningBadgeLabel({ verified, dictionary, creative })}</span>;
}

export function ResultCard({ record }: { record: LoomRecord }) {
  const creative = isCreativeInterpretation(record);
  return <div className="result-panes"><article className="meaning-pane"><MeaningBadge verified={record.verified} dictionary={hasDictionaryMeaning(record)} creative={creative}/><h3>{creative ? "A possible reading" : record.verified ? "What it means" : "What it could mean"}</h3><p>{record.meaning}</p>{record.sourceUrl && <a className="source-link" href={record.sourceUrl} target="_blank" rel="noreferrer">{record.source || "Read the source"} <ArrowUpRight size={14}/></a>}{hasDictionaryMeaning(record) && <small className="dictionary-attribution">Meaning excerpt: Wiktionary contributors. <a href={DICTIONARY_LICENSE} target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. The selected definition is shortened; the linked revision preserves its source. Context still matters.</small>}{!record.verified && <small>{creative ? "A visitor expression explored with AI. No published meaning was confirmed; this interpretation may miss your intent." : "This meaning needs a human check. Context matters."}</small>}</article><article className="myth-pane"><span className="stamp fiction">✳ {record.mode === "prepared" ? "A MYTH · PREPARED FICTION" : record.mode === "demo" ? "A MYTH · STUDIO SAMPLE" : "A MYTH, WOVEN JUST NOW"}</span><h3>How it <em>could</em> have begun</h3><p>{record.myth}</p><small>Made-up folklore. {record.mode === "prepared" ? "Prepared for the collection." : record.mode === "demo" ? "Authored studio sample." : "Created with AI."} This is not the phrase’s real origin.</small></article><article className="voice-pane"><span className="stamp voice">↗ IN ITS OWN VOICE</span><h3>{record.voiceMode === "lyric" ? "Four lines, full feeling" : "A little everyday story"}</h3><p className={record.voiceMode === "lyric" ? "lyric" : ""}>{record.voice}</p><small>{record.mode === "prepared" ? "From our prepared collection" : record.mode === "demo" ? "From our demo collection" : "A new thread, made for you"}</small></article></div>;
}
