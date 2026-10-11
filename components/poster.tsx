"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Check, Copy, Maximize2, Minimize2 } from "lucide-react";
import type { LoomRecord } from "../lib/types";

import { DICTIONARY_LICENSE, hasDictionaryMeaning } from "../lib/meaning-attribution";
import { isCreativeInterpretation, MeaningBadge, meaningBadgeLabel } from "./loom-ui";

const COLORS = ["#e3eba4", "#e16643", "#c9d9ec", "#d2c3e4", "#efca75", "#b4d3c0"];
const INK = "#174e45";
const PAPER = "#f8f5e9";
const DISPLAY = '"Bricolage Grotesque", "Arial", sans-serif';
const BODY = '"DM Sans", "Arial", sans-serif';

function paletteColor(palette: number) {
  return COLORS[((Math.trunc(palette) % COLORS.length) + COLORS.length) % COLORS.length] || COLORS[0];
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      if (!word) continue;
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      // Keep long unbroken phrases within the tile too.
      for (const character of Array.from(word)) {
        if (line && ctx.measureText(line + character).width > width) {
          lines.push(line);
          line = character;
        } else {
          line += character;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function excerpt(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const allLines = wrapText(ctx, text, width);
  const lines = allLines.slice(0, maxLines);
  if (allLines.length > maxLines && lines.length) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return { lines, shortened: allLines.length > maxLines };
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

function drawWeave(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  const unit = 26;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = INK;
  for (let row = 0; row < Math.ceil(height / unit); row++) {
    for (let col = 0; col < Math.ceil(width / unit); col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillRect(x + col * unit, y + row * unit, Math.min(unit, width - col * unit), Math.min(unit, height - row * unit));
      }
    }
  }
}

function drawStamp(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = `700 18px ${BODY}`;
  const width = ctx.measureText(text).width + 26;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, 35);
  ctx.fillText(text, x + 13, y + 10);
}

async function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

async function loadArtwork(record: LoomRecord) {
  if (!record.artwork) return null;
  const url = new URL(record.artwork.url, window.location.origin);
  if (url.origin !== window.location.origin) {
    throw new Error("This artwork cannot be included in the poster. Use the share link to keep the complete thread.");
  }
  try {
    const artwork = await loadImage(url.href);
    if (!artwork.naturalWidth || !artwork.naturalHeight) throw new Error("Empty artwork");
    return artwork;
  } catch {
    throw new Error("The artwork couldn’t be loaded. Try downloading again when it appears in the preview.");
  }
}

function drawArtwork(ctx: CanvasRenderingContext2D, artwork: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / artwork.naturalWidth, height / artwork.naturalHeight);
  const imageWidth = artwork.naturalWidth * scale;
  const imageHeight = artwork.naturalHeight * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(artwork, x + (width - imageWidth) / 2, y + (height - imageHeight) / 2, imageWidth, imageHeight);
}

async function createPoster(record: LoomRecord, shareUrl: string, qrSrc: string): Promise<Blob> {
  if (!qrSrc || !shareUrl) throw new Error("The QR code is not ready. Try again in a moment.");
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`700 120px ${DISPLAY}`),
    document.fonts.load(`400 28px ${BODY}`),
  ]);
  const [qr, artwork] = await Promise.all([loadImage(qrSrc), loadArtwork(record)]);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser could not create the poster. The share link still works.");
  const color = paletteColor(record.palette);
  ctx.textBaseline = "top";
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 1200, 1600);
  ctx.fillStyle = color;
  ctx.fillRect(24, 24, 1152, 1552);
  ctx.fillStyle = INK;
  ctx.font = `700 38px ${DISPLAY}`;
  ctx.fillText("singlish loom.", 72, 67);
  ctx.font = `600 17px ${BODY}`;
  ctx.textAlign = "right";
  ctx.fillText(record.mode === "prepared" ? "PREPARED COLLECTION" : record.mode === "demo" ? "AUTHORED TEXT SAMPLE" : "A NEW THREAD, MADE FOR YOU", 1128, 78);
  ctx.textAlign = "left";
  ctx.fillRect(72, 134, 1056, 2);

  // The illustrated poster makes room for the art without losing long phrases.
  let phraseSize = artwork ? 88 : 144;
  let phraseLines: string[] = [];
  const phraseHeight = artwork ? 145 : 356;
  while (phraseSize >= 24) {
    ctx.font = `700 ${phraseSize}px ${DISPLAY}`;
    phraseLines = wrapText(ctx, record.phrase, 1056);
    if (phraseLines.length * phraseSize * 1.05 <= phraseHeight) break;
    phraseSize -= 3;
  }
  drawLines(ctx, phraseLines, 68, artwork ? 155 : 178, phraseSize * 1.05);
  if (artwork) {
    drawWeave(ctx, 72, 312, 1056, 20, color);
    drawArtwork(ctx, artwork, 72, 350, 1056, 650);
    ctx.fillStyle = INK;
    ctx.font = `600 15px ${BODY}`;
    ctx.fillText(record.artwork?.provider === "studio" ? "ILLUSTRATION · STUDIO SAMPLE" : record.artwork?.cached ? "ILLUSTRATION · GEMINI · SAVED ARTWORK" : "ILLUSTRATION · GENERATED WITH GEMINI", 72, 1013);
  } else {
    drawWeave(ctx, 72, 550, 1056, 52, color);
  }

  ctx.fillStyle = INK;
  drawStamp(ctx, meaningBadgeLabel({ verified: record.verified, dictionary: hasDictionaryMeaning(record), creative: isCreativeInterpretation(record) }), 72, artwork ? 1050 : 636);
  ctx.font = `400 ${artwork ? 23 : 29}px ${BODY}`;
  const meaning = excerpt(ctx, record.meaning, artwork ? 490 : 1056, 3);
  drawLines(ctx, meaning.lines, 72, artwork ? 1100 : 689, artwork ? 30 : 37);

  const mythX = artwork ? 626 : 72;
  drawStamp(ctx, record.mode === "prepared" ? "A MYTH · PREPARED FICTION" : record.mode === "demo" ? "A MYTH · STUDIO SAMPLE" : "A MYTH, WOVEN JUST NOW", mythX, artwork ? 1050 : 821);
  ctx.font = `600 ${artwork ? 15 : 17}px ${BODY}`;
  ctx.fillText("IMAGINED FOLKLORE · FICTION", mythX, artwork ? 1096 : 869);
  ctx.font = `400 ${artwork ? 22 : 26}px ${BODY}`;
  const myth = excerpt(ctx, record.myth, artwork ? 502 : 1056, artwork ? 3 : 4);
  drawLines(ctx, myth.lines, mythX, artwork ? 1126 : 902, artwork ? 28 : 34);

  ctx.font = `600 17px ${BODY}`;
  ctx.fillText(record.voiceMode === "lyric" ? "FOUR LINES, FULL FEELING" : "IN ITS OWN VOICE", 72, artwork ? 1226 : 1064);
  const illustratedLyric = artwork && record.voiceMode === "lyric";
  ctx.font = `500 ${illustratedLyric ? 21 : artwork ? 23 : 28}px ${BODY}`;
  const voice = excerpt(ctx, record.voice, 1056, illustratedLyric ? 4 : artwork ? 3 : 4);
  drawLines(ctx, voice.lines, 72, artwork ? 1258 : 1099, illustratedLyric ? 25 : artwork ? 28 : 36);

  ctx.fillStyle = PAPER;
  ctx.fillRect(56, artwork ? 1364 : 1288, 1088, artwork ? 168 : 228);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, 72, artwork ? 1376 : 1300, artwork ? 144 : 204, artwork ? 144 : 204);
  ctx.fillStyle = INK;
  const footerX = artwork ? 240 : 305;
  ctx.font = `700 ${artwork ? 30 : 34}px ${DISPLAY}`;
  ctx.fillText("Take a little Singlish home.", footerX, artwork ? 1377 : 1321);
  ctx.font = `400 ${artwork ? 20 : 23}px ${BODY}`;
  ctx.fillText(artwork ? "Scan for this same artwork and complete thread." : "Scan for this same meaning, myth, and voice.", footerX, artwork ? 1420 : 1376);
  ctx.font = `400 17px ${BODY}`;
  drawLines(ctx, wrapText(ctx, shareUrl, artwork ? 875 : 805).slice(0, 2), footerX, artwork ? 1454 : 1425, artwork ? 21 : 24);
  if (meaning.shortened || myth.shortened || voice.shortened) {
    ctx.font = `500 ${artwork ? 14 : 16}px ${BODY}`;
    ctx.fillText("A poster excerpt. The full thread lives at the link.", footerX, artwork ? 1504 : 1480);
  }
  if (hasDictionaryMeaning(record)) {
    ctx.font = `500 12px ${BODY}`;
    ctx.fillText("Meaning: Wiktionary contributors · CC BY-SA 4.0 · shortened excerpt · source and license via QR", 72, 1530);
  }
  drawWeave(ctx, 24, 1544, 1152, 32, color);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The poster could not be saved. Please try again.")), "image/png");
  });
}

type QRState = { id: string; url: string; src: string; error: string };

export function Poster({ record, expanded = false }: { record: LoomRecord; expanded?: boolean }) {
  const [qrState, setQRState] = useState<QRState | null>(null);
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(expanded);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ id: "", text: "" });
  const [copiedFor, setCopiedFor] = useState("");
  const [showLink, setShowLink] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  const currentQR = qrState?.id === record.id ? qrState : null;
  const shareUrl = currentQR?.url || "";
  const copied = copiedFor === record.id;
  const message = notice.id === record.id ? notice.text : "";

  useEffect(() => {
    let cancelled = false;
    const url = new URL(`/thread/${encodeURIComponent(record.id)}`, window.location.origin).href;
    import("qrcode")
      .then(module => (module.default || module).toDataURL(url, {
        errorCorrectionLevel: "M",
        width: 512,
        margin: 4,
        color: { dark: INK, light: "#ffffff" },
      }))
      .then(src => {
        if (!cancelled) setQRState({ id: record.id, url, src, error: "" });
      })
      .catch(() => {
        if (!cancelled) setQRState({ id: record.id, url, src: "", error: "The QR code couldn’t be created. Retry before downloading your poster." });
      });
    return () => { cancelled = true; };
  }, [record.id, retry]);

  async function download() {
    if (!currentQR?.src || saving) return;
    setSaving(true);
    setNotice({ id: record.id, text: "" });
    try {
      const blob = await createPoster(record, shareUrl, currentQR.src);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const filename = record.phrase.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "thread";
      anchor.href = url;
      anchor.download = `singlish-${filename}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setNotice({ id: record.id, text: "Your poster is ready — check your downloads." });
    } catch (error) {
      setNotice({ id: record.id, text: error instanceof Error ? error.message : "Couldn’t save the poster. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareUrl);
      setCopiedFor(record.id);
      setNotice({ id: record.id, text: "Share link copied. It opens this exact thread." });
    } catch {
      setShowLink(true);
      setNotice({ id: record.id, text: "Select and copy the link below." });
      requestAnimationFrame(() => { linkRef.current?.focus(); linkRef.current?.select(); });
    }
  }

  return (
    <section className={`poster-takehome ${open ? "expanded" : ""}`} aria-label="Your take-home poster">
      <div className="poster-copy">
        <div className="eyebrow">A LITTLE PIECE OF US, TO KEEP</div>
        <h3>Take a little Singlish home.</h3>
        <p>A poster for your phrase. A QR for its story. The same thread, wherever you take it.</p>
        <div className="poster-actions">
          <button className="solid-button" type="button" onClick={download} disabled={saving || !currentQR?.src}>
            <ArrowDownToLine size={17} />{saving ? "Saving poster…" : "Download poster"}
          </button>
          <button className="outline-button" type="button" onClick={copyLink} disabled={!shareUrl}>
            {copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Link copied" : "Copy share link"}
          </button>
          <button className="outline-button" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}>
            {open ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{open ? "Smaller preview" : "Preview poster"}
          </button>
        </div>
        {currentQR?.error && <><p className="poster-message" role="alert">{currentQR.error}</p><button className="outline-button" type="button" onClick={() => { setQRState(null); setRetry(value => value + 1); }}>Retry QR code</button></>}
        <p className="poster-message" role="status" aria-live="polite">{message || (!currentQR ? "Preparing your QR code…" : "")}</p>
        {showLink && <input ref={linkRef} aria-label="Share link to copy" readOnly value={shareUrl} className="poster-share-input" onFocus={event => event.currentTarget.select()} />}
      </div>
      <div className="poster-preview" style={{ backgroundColor: paletteColor(record.palette), color: INK }}>
        <div className="poster-preview-top"><span>singlish loom.</span><ArrowUpRight size={18} aria-hidden="true" /></div>
        <strong className="poster-phrase">{record.phrase}</strong>
        {record.artwork && <figure className="poster-artwork" style={{ margin: "18px 0 16px" }}>
          <img src={record.artwork.url} alt={record.artwork.alt} width={650} height={650} style={{ display: "block", width: "100%", height: "auto", aspectRatio: "1 / 1", objectFit: "contain" }} />
          <figcaption style={{ marginTop: 8, fontSize: 10, fontWeight: 700, letterSpacing: ".05em" }}>{record.artwork.provider === "studio" ? "ILLUSTRATION · STUDIO SAMPLE" : record.artwork.cached ? "ILLUSTRATION · GEMINI · SAVED ARTWORK" : "ILLUSTRATION · GENERATED WITH GEMINI"}</figcaption>
        </figure>}
        <div className={`tile-pattern pattern-${((record.palette % 4) + 4) % 4}`} aria-hidden="true" />
        <MeaningBadge verified={record.verified} dictionary={hasDictionaryMeaning(record)} creative={isCreativeInterpretation(record)}/>
        <p>{record.meaning}</p>
        {hasDictionaryMeaning(record) && <p className="dictionary-attribution">Meaning excerpt: <a href={record.sourceUrl || "#"} target="_blank" rel="noreferrer">Wiktionary contributors</a> · <a href={DICTIONARY_LICENSE} target="_blank" rel="noreferrer">CC BY-SA 4.0</a> · shortened.</p>}
        {open && <>
          <span className="stamp fiction">{record.mode === "prepared" ? "A MYTH · PREPARED FICTION" : record.mode === "demo" ? "A MYTH · STUDIO SAMPLE" : "A MYTH, WOVEN JUST NOW"}</span>
          <p>{record.myth}</p>
          <small>Imagined folklore. Fiction.</small>
          <span className="stamp voice">IN ITS OWN VOICE</span>
          <p style={{ whiteSpace: "pre-line" }}>{record.voice}</p>
        </>}
        {!open && <small>Includes {record.mode === "prepared" ? "a prepared fictional myth" : record.mode === "demo" ? "an authored sample myth" : "a freshly woven myth"}. Imagined folklore, always fiction.</small>}
        <div className="poster-preview-bottom">
          {currentQR?.src ? <img className="qr-code" src={currentQR.src} width={84} height={84} alt="QR code linking to this same saved thread" /> : <span className="qr-code" aria-label={currentQR?.error ? "QR code unavailable" : "QR code loading"}>QR</span>}
          <span>Many languages.<br />One very Singaporean voice.<br /><small>{record.mode === "prepared" ? "PREPARED COLLECTION" : record.mode === "demo" ? "AUTHORED TEXT SAMPLE" : "WOVEN WITH AI"}</small></span>
        </div>
      </div>
    </section>
  );
}
