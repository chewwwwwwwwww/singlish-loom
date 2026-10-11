"use client";
/* eslint-disable @next/next/no-img-element -- Same-origin immutable artwork uses native images for Vinext compatibility. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImageOff, Sparkles } from "lucide-react";
import type { LoomRecord } from "../lib/types";

export function ArtworkImage({ url, alt, loading = "lazy", reveal = false, onSettled }: {
  url: string; alt: string; loading?: "eager" | "lazy"; reveal?: boolean; onSettled?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  // A cached image can finish before hydration attaches its load handler.
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) {
      setReady(image.naturalWidth > 0);
      setFailed(image.naturalWidth === 0);
    } else {
      setReady(false);
      setFailed(false);
    }
  }, [url]);
  useEffect(() => { if (ready || failed) onSettled?.(); }, [ready, failed, onSettled]);
  return <div className={`art-image ${ready ? "is-ready" : ""} ${reveal ? "woven-reveal" : ""}`}>
    <img ref={imageRef} src={url} alt={alt} loading={loading} decoding="async" width={1024} height={1024} onLoad={() => { setReady(true); setFailed(false); }} onError={() => { setReady(false); setFailed(true); }} />
    {!ready && !failed && <span className="art-image-status" role="status">Unfolding the illustration…</span>}
    {failed && <div className="art-image-unavailable"><ImageOff size={22} aria-hidden="true"/><p>This illustration couldn’t load.</p><small>Your phrase and story are still here.</small></div>}
    {ready && reveal && <span className="art-reveal-thread" aria-hidden="true"/>}
  </div>;
}

export function artworkLabel(artwork: NonNullable<LoomRecord["artwork"]>) {
  if (artwork.provider === "studio") return "Prepared studio illustration";
  return artwork.cached ? "From the shared collection" : "Newly illustrated";
}

export function ArtworkView({ record, reveal = true, decoration, onSettled }: { record: LoomRecord; reveal?: boolean; decoration?: ReactNode; onSettled?: () => void }) {
  const artwork = record.artwork;
  if (!artwork) return <div className="artwork-unavailable" role="status"><ImageOff size={18} aria-hidden="true"/><div><strong>Artwork unavailable for this thread.</strong><p>The meaning, myth and voice are ready below. Try an illustrated sample such as blur sotong or chope.</p></div></div>;
  return <section className={`artwork-view artwork-palette-${record.palette % 6}`} aria-label={`Illustration for ${record.phrase}`}>
    <div className="artwork-picture"><div className="artwork-frame"><ArtworkImage key={artwork.url} url={artwork.url} alt={artwork.alt} loading="eager" reveal={reveal} onSettled={onSettled}/>{decoration}</div></div>
    <div className="artwork-copy"><div className="eyebrow"><Sparkles size={14} aria-hidden="true"/> THE VISUAL THREAD</div><h3>A little phrase.<br/>A whole world.</h3><p className="artwork-phrase">“{record.phrase}”</p><p className="artwork-description">An imagined scene, woven from the feeling of these words. Read the meaning, meet the myth, then take a little piece home.</p><div className="artwork-provenance"><span className="artwork-source-label">{artworkLabel(artwork)}</span><p>{artwork.provider === "studio" ? "An original image prepared for our studio collection." : artwork.cached ? "This phrase shares an illustration already in our collection." : "Created with AI for this phrase. It can become part of the shared collection."}</p></div><small className="artwork-fiction-note">Illustration is imagination. It does not show the phrase’s real origin.</small></div>
  </section>;
}
