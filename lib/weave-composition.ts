import type { TapestryResponse, TapestryThread } from "./types";

export const WEAVE_WIDTH = 1200;
export const WEAVE_HEIGHT = 780;
export const CLOTH = { left: 94, right: 1106, top: 110, bottom: 676 };
export const YARN_COLORS = ["#c5d477", "#d96a47", "#a7c9db", "#b69acb", "#e6bc62", "#86b49d"];
export const WARP_X = Array.from({ length: 43 }, (_, index) => 109 + index * (982 / 42));

export function isTapestryResponse(value: unknown): value is TapestryResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<TapestryResponse>;
  return Array.isArray(data.records) && Number.isSafeInteger(data.total) && (data.total ?? -1) >= 0
    && data.records.length === data.total
    && data.records.every((record) => record && typeof record.id === "string" && typeof record.phrase === "string"
      && Number.isFinite(record.palette) && Number.isFinite(record.createdAt))
    && new Set(data.records.map((record) => record.id)).size === data.records.length;
}

export interface YarnPoint { x: number; y: number }
export interface WovenThread {
  record: TapestryThread;
  seed: number;
  color: string;
  thickness: number;
  center: number;
  amplitude: number;
  frequency: number;
  phase: number;
  points: YarnPoint[];
  knots: YarnPoint[];
  label: YarnPoint;
  labelAngle: number;
  rhythm: number;
}

// FNV-1a gives each saved submission its own enduring place in the cloth.
// Coordinates never depend on the total, rank, viewport, or animation clock.
export function weaveHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function threadY(thread: Pick<WovenThread, "center" | "amplitude" | "frequency" | "phase">, x: number): number {
  const progress = (x - CLOTH.left) / (CLOTH.right - CLOTH.left);
  return thread.center
    + Math.sin(progress * Math.PI * 2 * thread.frequency + thread.phase) * thread.amplitude
    + Math.sin(progress * Math.PI * 4 + thread.phase / 2) * 8;
}

export function buildWeaveComposition(records: readonly TapestryThread[]): WovenThread[] {
  const unique = new Map<string, TapestryThread>();
  for (const record of records) if (!unique.has(record.id)) unique.set(record.id, record);
  return [...unique.values()]
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .map((record) => {
      const seed = weaveHash(record.id);
      const phraseSeed = weaveHash(record.phrase);
      const letters = [...record.phrase].filter((character) => /\p{L}/u.test(character)).length;
      const words = record.phrase.trim().split(/\s+/).filter(Boolean);
      const shape = {
        center: 194 + (seed % 395),
        amplitude: 17 + (phraseSeed % 34),
        frequency: 1 + (words.length % 3) * .5,
        phase: ((seed >>> 12) % 628) / 100,
      };
      const labelX = 146 + ((seed >>> 8) % 435);
      const label = { x: labelX, y: threadY(shape, labelX) };
      const labelAngle = Math.atan2(threadY(shape, labelX + 4) - label.y, 4);
      const points = Array.from({ length: 97 }, (_, index) => {
        const x = CLOTH.left + index * (CLOTH.right - CLOTH.left) / 96;
        return { x, y: threadY(shape, x) };
      });
      const knots = words.map((word, index) => {
        const x = 121 + (index + .55) * 938 / (words.length + .5);
        return { x, y: threadY(shape, x) + (word.length % 2 ? -2 : 2) };
      });
      return {
        record, seed, ...shape,
        color: YARN_COLORS[((record.palette % YARN_COLORS.length) + YARN_COLORS.length) % YARN_COLORS.length],
        thickness: 18 + Math.min(15, Math.floor(letters / 3)),
        points, knots, label, labelAngle,
        rhythm: 7 + (phraseSeed % 8),
      };
    });
}

export function findThreadAt(composition: readonly WovenThread[], point: YarnPoint): WovenThread | undefined {
  if (point.x < CLOTH.left || point.x > CLOTH.right) return undefined;
  // The newest yarn is uppermost when two contributions touch.
  return [...composition].reverse().find((thread) => Math.abs(threadY(thread, point.x) - point.y) <= thread.thickness / 2 + 7);
}
