"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";
import { MoveHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import type { MuralPatch } from "../lib/mural-composition";
import { composeKopitiamScene, type SceneElement } from "../lib/kopitiam-scene";
import { SCENE_SPRITE_ATLAS, SCENE_SPRITE_RECTS } from "../lib/scene-sprites";
import { KopitiamRoom } from "./kopitiam-room";
import { KopitiamProp, NeighbourMotif, type PhysicalProp } from "./kopitiam-props";

export interface MuralArrival {
  key: string;
  token: number;
  kind: "new" | "repeat";
  contributionId?: string;
}

const PROP_NAMES: Record<PhysicalProp, string> = {
  kopi: "a kopi cup", tissue: "a saved place", order: "a breakfast order", stool: "a seat", plant: "a little plant",
};

function SceneVisual({ element, patch }: { element: SceneElement; patch: MuralPatch }) {
  if (element.kind !== "motif") return <KopitiamProp kind={element.kind} variant={element.ordinal}/>;
  const rect = element.spriteIndex === null ? undefined : SCENE_SPRITE_RECTS[element.spriteIndex];
  if (rect) return <svg className="scene-cutout" viewBox={`${rect.x} ${rect.y} ${rect.width} ${rect.height}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true"><image href={SCENE_SPRITE_ATLAS.url} width={SCENE_SPRITE_ATLAS.width} height={SCENE_SPRITE_ATLAS.height}/></svg>;
  if (patch.phrase === "lepak" || patch.phrase === "bo jio" || !patch.artwork) return <NeighbourMotif phrase={patch.phrase}/>;
  // New saved illustrations become the painted surface of a real cup in the
  // room; their complete original artwork remains in the phrase gallery.
  return <svg className="scene-painted-cup" viewBox="0 0 200 200" aria-hidden="true"><defs><clipPath id={`cup-${element.id}`}><path d="M33 66h116l-10 87q-48 31-96 0Z"/></clipPath></defs><ellipse cx="91" cy="178" rx="84" ry="13" fill="#f8f6ed" stroke="#174e45" strokeWidth="3"/><path d="M147 80q63-10 37 47-14 24-40 15" fill="none" stroke="#174e45" strokeWidth="13"/><path d="M147 80q63-10 37 47-14 24-40 15" fill="none" stroke="#dd6040" strokeWidth="7"/><path d="M33 66h116l-10 87q-48 31-96 0Z" fill="#f8f6ed" stroke="#174e45" strokeWidth="3"/><image href={patch.artwork.url} x="20" y="43" width="150" height="130" preserveAspectRatio="xMidYMid slice" clipPath={`url(#cup-${element.id})`}/><path d="M33 66h116l-10 87q-48 31-96 0Z" fill="none" stroke="#174e45" strokeWidth="3"/><ellipse cx="91" cy="66" rx="58" ry="14" fill="#174e45" stroke="#f8f6ed" strokeWidth="4"/><path d="M53 30q-15-11 0-26m39 24q14-13 0-24" fill="none" stroke="#174e45" strokeWidth="3" strokeLinecap="round" opacity=".6"/></svg>;
}

export function KopitiamMural({ patches, selectedKey, selectedId, onSelect, arrival, replayToken = 0, paused = false, compact = false }: {
  patches: MuralPatch[];
  selectedKey?: string;
  selectedId?: string;
  onSelect?: (patch: MuralPatch, contributionId?: string) => void;
  arrival?: MuralArrival | null;
  replayToken?: number;
  paused?: boolean;
  compact?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const scene = useMemo(() => composeKopitiamScene(patches), [patches]);
  const byKey = useMemo(() => new Map(patches.map(patch => [patch.key, patch])), [patches]);
  const [closer, setCloser] = useState(false);
  const [whole, setWhole] = useState(false);
  const total = patches.reduce((sum, patch) => sum + patch.count, 0);
  return <div className={`kopitiam-mural${paused ? " is-paused" : ""}${compact ? " is-compact" : ""}${whole ? " shows-whole-room" : ""}${closer ? " looks-closer" : ""}`}>
    <div className="kopitiam-viewport" tabIndex={compact ? undefined : 0} role={compact ? undefined : "group"} aria-label={compact ? undefined : "Our living kopitiam. Scroll across the room and choose an object to explore its phrase."}>
      <div className="kopitiam-world" style={{ aspectRatio: `1600 / ${scene.height}`, width: closer ? "135%" : "100%" }}>
        <svg className="kopitiam-room" viewBox={`0 0 1600 ${scene.height}`} aria-hidden="true">
          <KopitiamRoom id={id}/>
          {scene.height > 1000 && <g><defs><pattern id={`${id}-continuing-street`} width="80" height="50" patternUnits="userSpaceOnUse"><rect width="80" height="50" fill="#c9d9d0"/><path d="M0 0h80v50H0Z" fill="none" stroke="#f8f6ed" strokeWidth="2"/><path d="M40 0v50" stroke="#174e45" strokeWidth=".5" opacity=".12"/></pattern></defs><rect y="1000" width="1600" height={scene.height - 1000} fill={`url(#${id}-continuing-street)`}/><path d="M40 1020h1520" stroke="#174e45" strokeWidth="3" strokeDasharray="8 10" opacity=".25"/></g>}
        </svg>
        {scene.elements.map((element, index) => {
          const patch = byKey.get(element.patchKey)!;
          const arriving = arrival?.key === patch.key && element.id === (arrival.contributionId || selectedId || patch.latestId);
          const selected = selectedId ? element.id === selectedId : selectedKey === patch.key && element.kind === "motif";
          const style = {
            left: `${element.x / 16}%`, top: `${element.y / scene.height * 100}%`,
            width: `${element.width / 16}%`, height: `${element.height / scene.height * 100}%`,
            zIndex: Math.round(element.depth) + (element.kind === "motif" ? 0 : 10000), "--object-angle": `${element.rotation}deg`,
            "--object-delay": `${Math.min(index * 45, 650)}ms`,
          } as CSSProperties;
          const description = element.kind === "motif" ? patch.phrase : `${PROP_NAMES[element.kind]} for ${patch.phrase}`;
          const inner = <><span className="scene-object-shadow" aria-hidden="true"/><span key={`${replayToken}:${arriving ? arrival!.token : 0}`} className="scene-object-visual"><SceneVisual element={element} patch={patch}/></span>{!compact && <span className="scene-object-label"><strong>{patch.phrase}</strong><small>Contribution {element.ordinal + 1} · {element.kind === "motif" ? "brought this to the room" : `added ${PROP_NAMES[element.kind]}`}</small></span>}</>;
          const attributes = { className: `scene-object${element.kind === "motif" ? " is-motif" : " is-detail"}${selected ? " is-selected" : ""}${arriving ? " is-arriving" : ""}`, style, "data-mural-key": patch.key, "data-mural-phrase": patch.phrase, "data-scene-contribution": element.id, "data-scene-kind": element.kind };
          return compact ? <div key={element.id} {...attributes} aria-hidden="true">{inner}</div> : <button key={element.id} {...attributes} aria-label={`Explore ${description}, contribution ${element.ordinal + 1}`} aria-pressed={selected} onClick={() => onSelect?.(patch, element.id)}>{inner}</button>;
        })}
        {!total && <div className="kopitiam-empty-room"><strong>A room waiting for our words.</strong><span>The first phrase brings the first character or object.</span></div>}
      </div>
    </div>
    {!compact && <div className="kopitiam-scene-caption"><p><span className="scene-mobile-hint"><MoveHorizontal size={14}/> Swipe across the room.</span> {total} {total === 1 ? "visitor" : "visitors"}, {total} things brought to this kopitiam. Choose an object to meet its phrase.</p><div role="group" aria-label="Scene scale"><button onClick={() => { setCloser(value => !value); setWhole(false); }} aria-pressed={closer}><ZoomIn size={14}/> Look closer</button><button onClick={() => { setCloser(false); setWhole(true); }} aria-pressed={whole && !closer}><ZoomOut size={14}/> Whole scene</button></div></div>}
  </div>;
}
