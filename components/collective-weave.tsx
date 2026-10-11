"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TapestryThread } from "../lib/types";
import {
  buildWeaveComposition, CLOTH, findThreadAt, threadY, WARP_X,
  WEAVE_HEIGHT, WEAVE_WIDTH, type WovenThread,
} from "../lib/weave-composition";

function strokePath(ctx: CanvasRenderingContext2D, thread: WovenThread, progress: number) {
  const finish = CLOTH.left + (CLOTH.right - CLOTH.left) * progress;
  ctx.beginPath();
  ctx.moveTo(thread.points[0].x, thread.points[0].y);
  for (const point of thread.points) {
    if (point.x >= finish) break;
    ctx.lineTo(point.x, point.y);
  }
  ctx.lineTo(finish, threadY(thread, finish));
  ctx.stroke();
}

function drawWarp(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, index: number) {
  const warp = index % 3 === 0 ? "#d5d6ad" : index % 3 === 1 ? "#e6d7b9" : "#d9dcc2";
  ctx.fillStyle = warp;
  ctx.fillRect(x - 5, top, 10, bottom - top);
  ctx.fillStyle = "#fff8e43d";
  ctx.fillRect(x - 4, top, 2, bottom - top);
  ctx.fillStyle = "#7f8a6530";
  ctx.fillRect(x + 3, top, 1, bottom - top);
}

function drawFoundation(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#e9ebde";
  ctx.fillRect(0, 0, WEAVE_WIDTH, WEAVE_HEIGHT);
  ctx.fillStyle = "#f0e8d5";
  ctx.fillRect(CLOTH.left, CLOTH.top, CLOTH.right - CLOTH.left, CLOTH.bottom - CLOTH.top);
  // The linen foundation is material, not a visitor submission.
  for (let y = CLOTH.top; y < CLOTH.bottom; y += 6) {
    ctx.fillStyle = y % 12 ? "#f8f2e130" : "#b4b49a18";
    ctx.fillRect(CLOTH.left, y, CLOTH.right - CLOTH.left, 2);
  }
  WARP_X.forEach((x, index) => {
    drawWarp(ctx, x, 88, 713 + (index % 3) * 6, index);
    ctx.strokeStyle = "#174e4540";
    ctx.lineWidth = .7;
    ctx.beginPath();
    ctx.moveTo(x, 700);
    ctx.quadraticCurveTo(x + (index % 2 ? 6 : -6), 722, x + (index % 2 ? 4 : -4), 736);
    ctx.stroke();
  });
  ctx.fillStyle = "#174e45";
  ctx.fillRect(70, 92, 1060, 9);
  ctx.fillRect(70, 682, 1060, 9);
  ctx.fillStyle = "#db714d";
  ctx.fillRect(70, 106, 1060, 3);
  ctx.fillRect(70, 694, 1060, 3);
  ctx.fillStyle = "#174e45";
  ctx.font = '700 19px "Bricolage Grotesque", sans-serif';
  ctx.fillText("SINGLISH LOOM", 94, 58);
  ctx.font = '500 12px "DM Sans", sans-serif';
  ctx.textAlign = "right";
  ctx.fillStyle = "#64746b";
  ctx.fillText("ONE CLOTH. EVERY VOICE.", 1106, 57);
  ctx.textAlign = "left";
  ctx.font = '500 12px "DM Sans", sans-serif';
  ctx.fillText("A little Singapore, woven together.", 94, 758);
  ctx.textAlign = "right";
  ctx.fillText("THE KOPITIAM TAPESTRY", 1106, 758);
  ctx.textAlign = "left";
}

function drawThread(ctx: CanvasRenderingContext2D, thread: WovenThread, progress = 1) {
  if (progress <= 0) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#174e4530";
  ctx.lineWidth = thread.thickness + 2;
  ctx.translate(0, 2);
  strokePath(ctx, thread, progress);
  ctx.translate(0, -2);
  ctx.strokeStyle = thread.color;
  ctx.lineWidth = thread.thickness;
  strokePath(ctx, thread, progress);
  ctx.strokeStyle = "#fff9e641";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([thread.rhythm * 2, 3]);
  ctx.translate(0, -thread.thickness / 3);
  strokePath(ctx, thread, progress);
  ctx.translate(0, thread.thickness / 3);
  ctx.setLineDash([]);
  const finish = CLOTH.left + (CLOTH.right - CLOTH.left) * progress;
  WARP_X.forEach((x, index) => {
    if (x > finish || ((index + thread.seed) % 2) === 0) return;
    const y = threadY(thread, x);
    drawWarp(ctx, x, y - thread.thickness / 2 - 1, y + thread.thickness / 2 + 1, index);
  });
  ctx.strokeStyle = "#174e4563";
  ctx.lineWidth = 1.2;
  thread.knots.forEach(({ x, y }, index) => {
    if (x > finish) return;
    ctx.beginPath();
    const size = 3 + (index % 2);
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x - size, y + size);
    ctx.lineTo(x + size, y - size);
    ctx.stroke();
  });
  if (progress > .97) {
    ctx.save();
    ctx.translate(thread.label.x, thread.label.y + 5);
    ctx.rotate(Math.max(-.08, Math.min(.08, thread.labelAngle)));
    ctx.fillStyle = "#174e45";
    ctx.font = '700 15px "Bricolage Grotesque", sans-serif';
    ctx.fillText(thread.record.phrase, 0, 0, Math.min(420, CLOTH.right - thread.label.x - 24));
    ctx.restore();
  }
  ctx.restore();
}

function drawSelected(ctx: CanvasRenderingContext2D, thread?: WovenThread) {
  if (!thread) return;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#174e45";
  ctx.setLineDash([3, 5]);
  ctx.translate(0, -thread.thickness / 2 - 4);
  strokePath(ctx, thread, 1);
  ctx.translate(0, thread.thickness + 8);
  strokePath(ctx, thread, 1);
  ctx.restore();
}

function drawShuttle(ctx: CanvasRenderingContext2D, thread: WovenThread, progress: number) {
  const x = CLOTH.left + (CLOTH.right - CLOTH.left) * progress;
  const y = threadY(thread, x);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(threadY(thread, x + 2) - y, 2));
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.quadraticCurveTo(0, -15, 26, 0); ctx.quadraticCurveTo(0, 15, -26, 0);
  ctx.fillStyle = "#174e45";
  ctx.fill();
  ctx.fillStyle = "#eab866";
  ctx.fillRect(-9, -3, 18, 6);
  ctx.restore();
}

export function CollectiveWeave({ records, selectedId, onSelect, replayToken = 0, paused = false, compact = false }: {
  records: TapestryThread[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  replayToken?: number;
  paused?: boolean;
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seenRef = useRef(new Set<string>());
  const replayRef = useRef(replayToken);
  const pausedRef = useRef(paused);
  const selectedRef = useRef(selectedId);
  const repaintRef = useRef<(() => void) | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const composition = useMemo(() => buildWeaveComposition(records), [records]);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(query.matches);
    change(); query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { selectedRef.current = selectedId; repaintRef.current?.(); }, [selectedId]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WEAVE_WIDTH * scale;
    canvas.height = WEAVE_HEIGHT * scale;
    const base = document.createElement("canvas");
    base.width = canvas.width; base.height = canvas.height;
    const baseCtx = base.getContext("2d");
    if (!baseCtx) return;
    baseCtx.scale(scale, scale);
    drawFoundation(baseCtx);
    const replay = replayRef.current !== replayToken;
    replayRef.current = replayToken;
    const arrivals = composition.filter((thread) => replay || !seenRef.current.has(thread.record.id));
    const arrivingIds = new Set(arrivals.map((thread) => thread.record.id));
    composition.filter((thread) => !arrivingIds.has(thread.record.id)).forEach((thread) => drawThread(baseCtx, thread));
    seenRef.current = new Set(composition.map((thread) => thread.record.id));
    let frame = 0;
    let elapsed = 0;
    let previousTime: number | null = null;
    let finished = false;
    const stagger = arrivals.length > 1 ? Math.min(95, 2200 / arrivals.length) : 0;
    const duration = compact ? 1350 : 1900;
    const paint = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      let current: { thread: WovenThread; progress: number } | undefined;
      arrivals.forEach((thread, index) => {
        const raw = reducedMotion || finished ? 1 : Math.max(0, Math.min(1, (elapsed - index * stagger) / duration));
        const progress = raw * raw * (3 - 2 * raw);
        drawThread(ctx, thread, progress);
        if (progress > 0 && progress < 1) current = { thread, progress };
      });
      if (current) drawShuttle(ctx, current.thread, current.progress);
      drawSelected(ctx, composition.find((thread) => thread.record.id === selectedRef.current));
    };
    const final = () => {
      // Always finish in canonical order, including if an older contribution
      // arrives from a delayed response. The same records make the same cloth.
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawFoundation(ctx);
      composition.forEach((thread) => drawThread(ctx, thread));
      drawSelected(ctx, composition.find((thread) => thread.record.id === selectedRef.current));
    };
    repaintRef.current = () => finished ? final() : paint();
    const tick = (now: number) => {
      if (previousTime !== null && !pausedRef.current) elapsed += now - previousTime;
      previousTime = now;
      if (reducedMotion || arrivals.length === 0 || elapsed >= duration + stagger * Math.max(0, arrivals.length - 1)) {
        finished = true; final(); return;
      }
      paint(); frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Redraw text once web fonts have settled, without replaying the artwork.
    void document.fonts.ready.then(() => repaintRef.current?.());
    return () => { cancelAnimationFrame(frame); repaintRef.current = null; };
  }, [composition, replayToken, reducedMotion, compact]);

  return <div className={`collective-weave${compact ? " is-compact" : ""}`}>
    <canvas ref={canvasRef} width={WEAVE_WIDTH} height={WEAVE_HEIGHT}
      role="img" aria-label={`One collective textile made from ${composition.length} real submissions. Each phrase changes its yarn's color, rhythm and curves. Choose a thread below to explore it.`}
      onClick={(event) => {
        if (!onSelect) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const found = findThreadAt(composition, { x: (event.clientX - bounds.left) * WEAVE_WIDTH / bounds.width, y: (event.clientY - bounds.top) * WEAVE_HEIGHT / bounds.height });
        if (found) onSelect(found.record.id);
      }} />
    {!records.length && <div className="collective-weave-empty"><span className="eyebrow">THE LOOM IS READY</span><strong>Your voice starts the cloth.</strong><p>The first real phrase will become its first coloured thread.</p></div>}
  </div>;
}
