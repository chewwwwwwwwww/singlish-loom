"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors retain Vinext compatibility. */
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { KopitiamMural } from "./kopitiam-mural";
import { groupMuralContributions } from "../lib/mural-composition";
import { useMuralFeed } from "./use-mural-feed";

export function CollectiveWeavePreview() {
  const { data, loaded, error } = useMuralFeed();
  const patches = useMemo(() => groupMuralContributions(data.records), [data.records]);
  return <div className="mural-preview">
    <a href="/wall" className="mural-preview-art" aria-label={`Explore the living kopitiam mural with ${patches.length} illustrated phrases and ${data.total} contributions`}>
      {loaded ? <KopitiamMural patches={patches} compact/> : <div className="mural-loading">Opening the kopitiam…</div>}
      <span className="mural-preview-open">Step into the whole picture <ArrowUpRight size={15}/></span>
    </a>
    <div className="mural-preview-caption"><span>{error ? "The kopitiam is reconnecting" : `${data.total} contributions · ${patches.length} phrases in one living scene`}</span><a href="/wall?view=gallery">Explore the phrase gallery <ArrowUpRight size={14}/></a></div>
  </div>;
}
