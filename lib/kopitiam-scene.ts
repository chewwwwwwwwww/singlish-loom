import { normalizePhrase } from "./corpus";
import type { MuralPatch, MuralZone } from "./mural-composition";

export type SceneDetailKind = "kopi" | "tissue" | "order" | "stool" | "plant";
export type SceneElementKind = "motif" | SceneDetailKind;

export interface SceneElement {
  /** The saved contribution ID, not a synthetic phrase or aggregate ID. */
  id: string;
  patchKey: string;
  phrase: string;
  ordinal: number;
  kind: SceneElementKind;
  fallbackKind: SceneDetailKind;
  zone: MuralZone;
  /** The 6 × 5 transparent sprite sheet follows this curated studio-art order. */
  spriteIndex: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  rotation: number;
}

export interface KopitiamScene {
  width: 1600;
  height: number;
  elements: SceneElement[];
}

interface MotifPlacement {
  phrase: string;
  x: number;
  y: number;
  width: number;
  rotation?: number;
}

/**
 * Positions are editorial visual metaphors, not statements about a phrase's
 * origin. Objects share counter, tables, lounge and walkway depth planes.
 * Their position does not depend on which other phrases are present.
 */
const STUDIO_PLACEMENTS: readonly MotifPlacement[] = [
  { phrase: "blur sotong", x: 610, y: 385, width: 200, rotation: -3 },
  { phrase: "kanchiong spider", x: 145, y: 210, width: 170, rotation: -3 },
  { phrase: "stun like vegetable", x: 50, y: 470, width: 145, rotation: 2 },
  { phrase: "pattern more than badminton", x: 1280, y: 150, width: 180, rotation: 5 },
  { phrase: "my grandma run faster than you", x: 70, y: 785, width: 180, rotation: -5 },
  { phrase: "your grandfather road issit?", x: 300, y: 770, width: 180, rotation: 2 },
  { phrase: "steady pom pi pi", x: 355, y: 240, width: 140 },
  { phrase: "double confirm", x: 485, y: 440, width: 125, rotation: -4 },
  { phrase: "confirm plus chop", x: 425, y: 265, width: 120, rotation: 3 },
  { phrase: "chop chop curry pok", x: 40, y: 210, width: 160, rotation: -3 },
  { phrase: "chope", x: 820, y: 440, width: 170 },
  { phrase: "gostun", x: 550, y: 770, width: 180, rotation: -3 },
  { phrase: "can is can", x: 1110, y: 600, width: 175 },
  { phrase: "win liao lor", x: 1130, y: 440, width: 155, rotation: -3 },
  { phrase: "go fly kite", x: 1440, y: 55, width: 135, rotation: 6 },
  { phrase: "wake up your idea", x: 915, y: 230, width: 130, rotation: -3 },
  { phrase: "one time good one", x: 280, y: 500, width: 135, rotation: 2 },
  { phrase: "i.e. to say", x: 1100, y: 165, width: 140, rotation: -4 },
  { phrase: "you think i thought who confirm", x: 1120, y: 300, width: 155 },
  { phrase: "die die must", x: 1060, y: 800, width: 180, rotation: -4 },
  { phrase: "shiok", x: 685, y: 465, width: 150, rotation: 2 },
  { phrase: "sorry, no cure", x: 100, y: 640, width: 140, rotation: -4 },
  { phrase: "last touch", x: 445, y: 625, width: 150, rotation: 3 },
  { phrase: "chim", x: 1310, y: 415, width: 155, rotation: -2 },
  { phrase: "atas", x: 965, y: 440, width: 150, rotation: 2 },
  { phrase: "orhor", x: 1360, y: 445, width: 140, rotation: 3 },
  { phrase: "aiyo", x: 1290, y: 680, width: 165, rotation: -4 },
];

/** Public for the atlas builder and a check against accidental artwork drift. */
export const SCENE_SPRITE_TERMS = STUDIO_PLACEMENTS.map((placement) => placement.phrase);

const STUDIO_BY_PHRASE = new Map(STUDIO_PLACEMENTS.map((placement, spriteIndex) => [
  normalizePhrase(placement.phrase), { ...placement, spriteIndex },
]));

// Reviewed extra phrases receive small real objects in the same shop rather
// than becoming framed pictures of their full generated artwork.
const EXTRA_PLACEMENTS: readonly MotifPlacement[] = [
  { phrase: "paiseh", x: 1220, y: 475, width: 105 },
  { phrase: "kiasu", x: 245, y: 280, width: 105 },
  { phrase: "sian", x: 745, y: 490, width: 115, rotation: -3 },
  { phrase: "bo jio", x: 915, y: 600, width: 190 },
  { phrase: "jialat", x: 290, y: 278, width: 110 },
  { phrase: "lah", x: 1150, y: 475, width: 100 },
  { phrase: "lor", x: 1350, y: 477, width: 105 },
  { phrase: "leh", x: 1365, y: 477, width: 100 },
  { phrase: "makan", x: 880, y: 490, width: 115 },
  { phrase: "tapau", x: 365, y: 270, width: 110 },
  { phrase: "alamak", x: 190, y: 283, width: 105 },
  { phrase: "bo pian", x: 1205, y: 480, width: 100 },
  { phrase: "catch no ball", x: 1380, y: 480, width: 100 },
  { phrase: "kopitiam", x: 785, y: 485, width: 120 },
  { phrase: "kena", x: 1285, y: 465, width: 110 },
  { phrase: "lepak", x: 1020, y: 555, width: 190, rotation: -2 },
  { phrase: "sabo", x: 1270, y: 487, width: 95 },
  { phrase: "heng ah", x: 1140, y: 473, width: 105 },
];
const EXTRA_BY_PHRASE = new Map(EXTRA_PLACEMENTS.map((placement) => [normalizePhrase(placement.phrase), placement]));
const RESERVED_TERMS = [...STUDIO_PLACEMENTS, ...EXTRA_PLACEMENTS].map((entry) => normalizePhrase(entry.phrase));
const RESERVED_RANK = new Map(RESERVED_TERMS.map((phrase, index) => [phrase, index]));

const DETAIL_KINDS: Record<MuralZone, readonly SceneDetailKind[]> = {
  table: ["kopi", "tissue", "stool"],
  counter: ["order", "kopi", "tissue"],
  conversation: ["kopi", "stool", "tissue"],
  street: ["plant", "stool"],
};

// New words arrive in the same shop. These places are reserved independently
// of submitted corpus phrases, and filled chronologically without relocating
// an earlier contribution. Three places per surface keep the first twelve
// dictionary-supported discoveries inside the original room.
const SHARED_DISCOVERY_SLOTS: Record<MuralZone, readonly Pick<MotifPlacement, "x" | "y" | "width">[]> = {
  counter: [
    { x: 215, y: 285, width: 95 },
    { x: 315, y: 282, width: 98 },
    { x: 418, y: 270, width: 100 },
  ],
  table: [
    { x: 665, y: 475, width: 125 },
    { x: 820, y: 475, width: 125 },
    { x: 950, y: 475, width: 125 },
  ],
  conversation: [
    { x: 1130, y: 465, width: 115 },
    { x: 1270, y: 465, width: 115 },
    { x: 1390, y: 470, width: 110 },
  ],
  street: [
    { x: 260, y: 800, width: 130 },
    { x: 770, y: 800, width: 130 },
    { x: 1150, y: 800, width: 130 },
  ],
};
const SHARED_DISCOVERY_ZONES: readonly MuralZone[] = ["table", "counter", "conversation", "street"];
const SHARED_DISCOVERY_CAPACITY = 12;

function fallbackKind(phrase: string, zone: MuralZone): SceneDetailKind {
  if (phrase === "chope" || phrase === "bo jio") return "tissue";
  if (phrase === "lepak" || phrase === "sian") return "stool";
  if (phrase === "tapau" || phrase === "double confirm" || phrase === "confirm plus chop") return "order";
  return DETAIL_KINDS[zone][0];
}

function chronological(a: MuralPatch, b: MuralPatch): number {
  return a.firstCreatedAt - b.firstCreatedAt || a.firstId.localeCompare(b.firstId);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function detailWidth(ordinal: number, kind: SceneElementKind): number {
  return kind === "stool" || kind === "plant" ? 60 : 44 + ((ordinal - 1) % 3) * 3;
}

/**
 * Props contact a real shared surface. A stool cannot use a cup's tabletop
 * anchor, and a front row must stay on the top rather than descend down a
 * cupboard face. Phrase offsets are fixed, so an arrival cannot move its
 * neighbours. The square's bottom is also the scene's grounding shadow.
 */
function localDetailPlacement(
  placement: Pick<MotifPlacement, "x" | "y" | "width">,
  phraseRank: number,
  ordinal: number,
  zone: MuralZone,
  kind: SceneDetailKind,
): { x: number; y: number; width: number } {
  const local = ordinal - 1;
  const onFloor = kind === "stool" || kind === "plant";
  const width = detailWidth(ordinal, kind);
  const column = local % 4;
  const row = Math.floor(local / 4);
  const phraseOffset = (phraseRank % RESERVED_TERMS.length) / RESERVED_TERMS.length * 12;
  const centre = placement.x + placement.width / 2;
  let x: number;
  let foot: number;

  if (zone === "counter") {
    x = clamp(centre - 80, 100, onFloor ? 238 : 285) + phraseOffset + column * (onFloor ? 65 : 52);
    // The counter edge angles upward toward the right of the shared room.
    foot = onFloor ? 650 + row * 52 : 380 + row * 19 - (x + width / 2 - 120) * .037;
  } else if (zone === "table") {
    x = clamp(centre - 80, onFloor ? 585 : 675, onFloor ? 920 : 790) + phraseOffset + column * (onFloor ? 65 : 52);
    foot = onFloor ? 745 + row * 25 : 592 + row * 27;
  } else if (zone === "conversation") {
    x = clamp(centre - 80, onFloor ? 1115 : 1130, onFloor ? 1320 : 1242) + phraseOffset + column * (onFloor ? 65 : 52);
    foot = onFloor ? 728 + row * 37 : 565 + row * 18;
  } else {
    x = clamp(centre - 80, 80, 1320) + phraseOffset + column * 65;
    foot = 924 + row * 34;
  }

  return { x, y: foot - width, width };
}

/**
 * A continuation cell is permanently reserved for each contribution ordinal.
 * Known expressions and main-room discoveries use fixed compact repeat lanes
 * on the left of the continued street. Excess new expressions receive their
 * own place on the right, beginning beside the first overflow row. No empty
 * full-width bands are needed before an overflow contribution is visible.
 */
function continuation(phraseRank: number, ordinal: number, unknown: boolean, kind: SceneElementKind = "motif"): { x: number; y: number; width: number } {
  const width = detailWidth(ordinal, kind);
  if (!unknown) {
    const repeat = ordinal - 9;
    return {
      x: 45 + (phraseRank % 15) * 62,
      y: 1040 + repeat * 280 + Math.floor(phraseRank / 15) * 70,
      width,
    };
  }
  // The right-hand strip is disjoint from every known repeat lane. Its first
  // new phrase starts just forty pixels beyond the original street.
  const column = phraseRank % 2;
  const neighbourhood = Math.floor(phraseRank / 2);
  const detailIndex = Math.max(0, ordinal - 1);
  const page = Math.floor(detailIndex / 16);
  const index = detailIndex % 16;
  // Cantor pairing keeps neighbourhood pages disjoint even if one accepted
  // expression becomes very popular. No visitor contribution is capped.
  const paired = (neighbourhood + page) * (neighbourhood + page + 1) / 2 + page;
  const bayY = 1040 + paired * 480;
  if (ordinal === 0) return { x: 1060 + column * 270, y: bayY, width: 155 };
  return {
    x: 1060 + column * 270 + (index % 4) * 64,
    y: bayY + 175 + Math.floor(index / 4) * 70,
    width,
  };
}

export function composeKopitiamScene(patches: readonly MuralPatch[]): KopitiamScene {
  const ordered = [...patches].sort(chronological);
  const unknownPhrases = ordered.filter((patch) => !RESERVED_RANK.has(normalizePhrase(patch.phrase)));
  const unknownRanks = new Map(unknownPhrases.map((patch, index) => [patch.key, index]));
  const sharedDiscoveries = new Map<string, { zone: MuralZone; placement: Pick<MotifPlacement, "x" | "y" | "width"> }>();
  const usedDiscoverySlots: Record<MuralZone, number> = { counter: 0, table: 0, conversation: 0, street: 0 };
  for (const patch of unknownPhrases.slice(0, SHARED_DISCOVERY_CAPACITY)) {
    const zone = usedDiscoverySlots[patch.zone] < 3 ? patch.zone
      : SHARED_DISCOVERY_ZONES.find((candidate) => usedDiscoverySlots[candidate] < 3)!;
    sharedDiscoveries.set(patch.key, { zone, placement: SHARED_DISCOVERY_SLOTS[zone][usedDiscoverySlots[zone]++] });
  }
  const elements: SceneElement[] = [];
  const seenIds = new Set<string>();
  for (const patch of ordered) {
    const phrase = normalizePhrase(patch.phrase);
    const studio = STUDIO_BY_PHRASE.get(phrase);
    const curated = studio ?? EXTRA_BY_PHRASE.get(phrase);
    const unknown = !curated;
    const sharedDiscovery = sharedDiscoveries.get(patch.key);
    const sceneZone = sharedDiscovery?.zone ?? patch.zone;
    const phraseRank = unknown ? unknownRanks.get(patch.key)! : RESERVED_RANK.get(phrase)!;
    const overflowRank = Math.max(0, phraseRank - SHARED_DISCOVERY_CAPACITY);
    const firstPlacement = curated ?? sharedDiscovery?.placement ?? continuation(overflowRank, 0, true);
    for (const [ordinal, id] of patch.contributionIds.entries()) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const kind = ordinal === 0 ? "motif" : DETAIL_KINDS[sceneZone][(ordinal - 1) % DETAIL_KINDS[sceneZone].length];
      let placement: { x: number; y: number; width: number };
      if (ordinal === 0) placement = firstPlacement;
      else if (unknown && !sharedDiscovery) placement = continuation(overflowRank, ordinal, true, kind);
      else if (ordinal <= 8 && kind !== "motif") {
        placement = localDetailPlacement(firstPlacement, unknown ? RESERVED_TERMS.length + phraseRank : phraseRank, ordinal, sceneZone, kind);
      } else placement = continuation(unknown ? phraseRank : SHARED_DISCOVERY_CAPACITY + phraseRank, ordinal, false, kind);
      elements.push({
        id, patchKey: patch.key, phrase: patch.phrase, ordinal, kind,
        fallbackKind: fallbackKind(phrase, sceneZone), zone: sceneZone,
        spriteIndex: ordinal === 0 ? studio?.spriteIndex ?? null : null,
        ...placement, height: placement.width,
        depth: placement.y + placement.width,
        rotation: ordinal === 0 ? curated?.rotation ?? 0 : [-5, 3, -2, 4][(ordinal - 1) % 4],
      });
    }
  }
  elements.sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
  return {
    width: 1600,
    height: Math.max(1000, ...elements.map((element) => element.y + element.height + 32)),
    elements,
  };
}
