"use client";

import { useId, useMemo, useState } from "react";
import { ArrowUpRight, ImageOff, Search, X } from "lucide-react";
import Link from "next/link";
import { ArtworkImage } from "./artwork-view";
import { isCreativeInterpretation, MeaningBadge } from "./loom-ui";
import { hasDictionaryMeaning } from "../lib/meaning-attribution";
import { MURAL_ZONES, type MuralPatch } from "../lib/mural-composition";

const ZONES: { key: MuralPatch["zone"] | "all"; label: string }[] = [
  { key: "all", label: "Everywhere" },
  ...MURAL_ZONES.map(zone => ({ key: zone.id, label: zone.label })),
];

export function MuralGallery({ patches, selectedKey, onSelect }: {
  patches: MuralPatch[];
  selectedKey?: string;
  onSelect: (patch: MuralPatch) => void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<MuralPatch["zone"] | "all">("all");
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("en-SG");
    const compactNeedle = needle.replace(/[\s-]+/g, "");
    return patches.filter(patch =>
      (zone === "all" || patch.zone === zone) &&
      (!needle || `${patch.phrase} ${patch.meaning}`.toLocaleLowerCase("en-SG").includes(needle) || Boolean(compactNeedle && patch.phrase.toLocaleLowerCase("en-SG").replace(/[\s-]+/g, "").includes(compactNeedle))),
    );
  }, [patches, query, zone]);

  if (!patches.length) return <section className="mural-gallery mural-gallery-empty" aria-label="Phrase gallery">
    <div className="mural-gallery-empty-mark" aria-hidden="true">＋</div>
    <h2>The first patch is yours.</h2>
    <p>Choose a phrase and its illustration will join the kopitiam. Every contribution becomes part of the scene and this gallery.</p>
    <Link href="/" className="text-link">Add a phrase <ArrowUpRight size={15} aria-hidden="true"/></Link>
  </section>;

  return <section className="mural-gallery" aria-label="Explore the contributed phrases">
    <div className="mural-gallery-intro">
      <div><h2>Meet the phrases.</h2><p>Checked meanings, creative expressions and imagined stories. Choose one to look closer.</p></div>
      <span>{patches.length.toLocaleString("en-SG")} {patches.length === 1 ? "phrase" : "phrases"} in the kopitiam</span>
    </div>
    <div className="mural-gallery-tools">
      <div className="mural-gallery-search">
        <label htmlFor={searchId}>Find a phrase</label>
        <div className="mural-gallery-search-field">
          <Search size={17} aria-hidden="true"/>
          <input id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search phrases or meanings" autoComplete="off" spellCheck={false}/>
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear phrase search"><X size={16} aria-hidden="true"/></button>}
        </div>
      </div>
      <div className="mural-gallery-filters" role="group" aria-label="Filter by place in the kopitiam">
        {ZONES.map(item => <button key={item.key} type="button" aria-pressed={zone === item.key} onClick={() => setZone(item.key)}>{item.label}</button>)}
      </div>
    </div>
    <p className="mural-gallery-result-count" role="status" aria-live="polite" aria-atomic="true">{results.length === patches.length ? "Showing every contributed phrase" : `${results.length.toLocaleString("en-SG")} ${results.length === 1 ? "phrase" : "phrases"} found`}</p>
    {results.length ? <div className="mural-gallery-grid">
      {results.map(patch => <article key={patch.key} className={`mural-gallery-item mural-gallery-palette-${patch.palette % 6}`} data-gallery-phrase={patch.phrase}>
        <button type="button" className={`mural-gallery-card${selectedKey === patch.key ? " is-selected" : ""}`} onClick={() => onSelect(patch)} aria-label={`Explore ${patch.phrase}, ${patch.count} ${patch.count === 1 ? "contribution" : "contributions"}`}>
          <span className="mural-gallery-image">
            {patch.artwork ? <ArtworkImage url={patch.artwork.url} alt={patch.artwork.alt}/> : <span className="mural-gallery-art-missing"><ImageOff size={24} aria-hidden="true"/><span>Illustration unavailable</span><small>The meaning and story are here.</small></span>}
          </span>
          <span className="mural-gallery-caption">
            <span className="mural-gallery-card-top"><span>{ZONES.find(item => item.key === patch.zone)?.label}</span><span>{patch.count.toLocaleString("en-SG")} {patch.count === 1 ? "contribution" : "contributions"}</span></span>
            <span className="mural-gallery-phrase">{patch.phrase}</span>
            <MeaningBadge verified={patch.verified} dictionary={hasDictionaryMeaning(patch)} creative={isCreativeInterpretation(patch)}/>
            <span className="mural-gallery-meaning">{patch.meaning}</span>
            <span className="mural-gallery-open">Explore the phrase <ArrowUpRight size={15} aria-hidden="true"/></span>
          </span>
        </button>
      </article>)}
    </div> : <div className="mural-gallery-no-results">
      <h3>No phrases match this search.</h3><p>Try another word or explore every part of the kopitiam.</p>
      <button type="button" className="text-link" onClick={() => { setQuery(""); setZone("all"); }}>Show all phrases <ArrowUpRight size={15} aria-hidden="true"/></button>
    </div>}
    <p className="mural-gallery-footnote">Repeated phrases share one illustration. Each visitor brings another object to the shared scene. Meanings keep their evidence labels; visitor expressions without a confirmed source stay unverified. The scenes and stories are fiction.</p>
  </section>;
}
