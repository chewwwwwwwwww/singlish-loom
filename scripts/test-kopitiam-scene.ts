import assert from "node:assert/strict";
import { CORPUS } from "../lib/corpus";
import { DICTIONARY } from "../lib/dictionary";
import { composeKopitiamScene, SCENE_SPRITE_TERMS, type SceneElement } from "../lib/kopitiam-scene";
import { groupMuralContributions } from "../lib/mural-composition";
import { STUDIO_ART } from "../lib/studio-art";
import type { MuralContribution } from "../lib/types";

let checks = 0;
function test(name: string, run: () => void) { run(); checks++; console.log(`✓ ${name}`); }
function record(phrase: string, index: number): MuralContribution {
  const term = CORPUS.find((entry) => entry.term === phrase);
  const studio = STUDIO_ART[phrase];
  return {
    id: `contribution-${String(index).padStart(6, "0")}`, phrase, createdAt: 1000 + index,
    meaning: term?.meaning ?? "Relax or loiter casually.", verified: term?.verified ?? false,
    source: term?.source ?? null, sourceUrl: term?.sourceUrl ?? null, palette: index % 6,
    artwork: studio ? { ...studio, provider: "studio", cached: true } : null,
  };
}
function compose(records: readonly MuralContribution[]) { return composeKopitiamScene(groupMuralContributions(records)); }
function byId(elements: readonly SceneElement[]) { return new Map(elements.map((element) => [element.id, element])); }

test("every studio atlas position refers to the original 27 phrases in order", () => {
  assert.equal(SCENE_SPRITE_TERMS.length, 27);
  assert.deepEqual(SCENE_SPRITE_TERMS, Object.keys(STUDIO_ART));
  const records = CORPUS.map((entry, index) => record(entry.term, index));
  const scene = compose(records);
  assert.equal(scene.width, 1600);
  assert.equal(scene.elements.length, 27);
  assert.equal(new Set(scene.elements.map((element) => `${element.x},${element.y}`)).size, 27);
  for (const element of scene.elements) {
    assert.equal(element.kind, "motif");
    assert.equal(SCENE_SPRITE_TERMS[element.spriteIndex!].replace(/[?!]$/, ""), element.phrase.replace(/[?!]$/, ""));
    assert.ok(element.x >= 0 && element.x + element.width <= 1600);
    assert.ok(element.y >= 0 && element.y + element.height <= scene.height);
    assert.equal(element.depth, element.y + element.height);
  }
});

test("empty scene has furniture-sized bounds and no invented visitors", () => {
  assert.deepEqual(compose([]), { width: 1600, height: 1000, elements: [] });
});

test("each saved contribution adds a distinct physical element, not just a count", () => {
  const records = [record("kanchiong spider", 0), record("kan chiong spider", 1), record("kan-chiong spider", 2), record("chope", 3)];
  const scene = compose(records);
  assert.equal(scene.elements.length, records.length);
  assert.deepEqual(new Set(scene.elements.map((element) => element.id)), new Set(records.map((item) => item.id)));
  const spider = scene.elements.filter((element) => element.patchKey === "kanchiong spider").sort((a, b) => a.ordinal - b.ordinal);
  assert.deepEqual(spider.map((element) => element.kind), ["motif", "order", "kopi"]);
  assert.equal(spider[0].spriteIndex, 1);
  assert.ok(spider.slice(1).every((element) => element.spriteIndex === null));
  assert.equal(new Set(spider.map((element) => `${element.x},${element.y}`)).size, 3);
  assert.equal(compose([records[0], records[0]]).elements.length, 1);
});

test("repeat props rest on the shared counter, round table, bench or floor", () => {
  const records = CORPUS.flatMap((entry, phraseIndex) => Array.from({ length: 9 }, (_, ordinal) => record(entry.term, phraseIndex * 9 + ordinal)));
  const scene = compose(records);
  const details = scene.elements.filter((element) => element.ordinal > 0);
  assert.equal(details.length, 27 * 8);
  for (const element of details) {
    const foot = element.y + element.height;
    const centre = element.x + element.width / 2;
    const floorProp = element.kind === "stool" || element.kind === "plant";
    const message = `${element.phrase}: ${element.kind} contribution ${element.ordinal + 1}`;
    assert.equal(element.width, floorProp ? 60 : 44 + ((element.ordinal - 1) % 3) * 3, `${message} stays visible at room scale`);
    if (element.zone === "counter") {
      assert.ok(element.x >= 45 && element.x + element.width <= 505, message);
      assert.ok(foot >= 357 && foot <= 405, `${message} must contact the top, not the cupboard front`);
    } else if (element.zone === "table") {
      if (floorProp) {
        assert.ok(foot >= 710 && foot <= 775, `${message} is a floor object`);
      } else {
        assert.ok(element.x >= 675 && element.x + element.width <= 1020, message);
        assert.ok(foot >= 545 && foot <= 640, message);
        const insideEllipse = ((centre - 853) / 201) ** 2 + ((foot - 601) / 66) ** 2;
        assert.ok(insideEllipse <= 1, `${message} must contact the actual round tabletop`);
      }
    } else if (element.zone === "conversation") {
      if (floorProp) assert.ok(foot >= 690 && foot <= 770, `${message} is below the bench`);
      else {
        assert.ok(element.x >= 1120 && element.x + element.width <= 1460, message);
        assert.ok(foot >= 565 && foot <= 585, `${message} must contact the bench seat`);
      }
    } else {
      assert.ok(foot >= 850 && foot <= 965, `${message} must contact the five-foot-way floor`);
    }
  }
  assert.ok(details.some((element) => element.kind === "stool" && element.zone === "table"));
  assert.ok(details.some((element) => element.kind === "stool" && element.zone === "conversation"));
  assert.ok(details.some((element) => element.ordinal >= 5 && element.zone === "counter"), "front-row counter props are covered");
});

test("repeat props remain visible in continuation lanes and native neighbours meet the floor", () => {
  const scene = compose([
    ...Array.from({ length: 22 }, (_, index) => record("kanchiong spider", index)),
    ...Array.from({ length: 22 }, (_, index) => record("lepak", 22 + index)),
    ...Array.from({ length: 22 }, (_, index) => record("a supported new phrase", 44 + index)),
    record("bo jio", 66),
  ]);
  for (const element of scene.elements.filter((item) => item.ordinal > 0)) {
    assert.ok(element.width >= 44 && element.width <= 60, `${element.phrase} contribution ${element.ordinal + 1}`);
    if (element.kind === "stool" || element.kind === "plant") assert.equal(element.width, 60);
  }
  for (const phrase of ["lepak", "bo jio"]) {
    const neighbour = scene.elements.find((element) => element.phrase === phrase && element.ordinal === 0)!;
    assert.equal(neighbour.width, 190, `${phrase} can be seen beside the shared furniture`);
    assert.ok(neighbour.y + neighbour.height >= 710 && neighbour.y + neighbour.height <= 800, `${phrase} meets the indoor floor`);
  }
});

test("reviewed extra phrase cups contact shared surfaces instead of floating on the wall", () => {
  const phrases = [...DICTIONARY.map((entry) => entry.term), "sabo", "heng ah"].filter((phrase) => phrase !== "bo jio" && phrase !== "lepak");
  const scene = compose(phrases.map(record));
  for (const element of scene.elements) {
    const foot = element.y + element.height;
    const centre = element.x + element.width / 2;
    assert.equal(element.kind, "motif");
    assert.equal(element.spriteIndex, null);
    if (element.zone === "counter") {
      assert.ok(centre >= 105 && centre <= 505 && foot >= 357 && foot <= 405, element.phrase);
    } else if (element.zone === "table") {
      assert.ok(((centre - 853) / 201) ** 2 + ((foot - 601) / 66) ** 2 <= 1, element.phrase);
    } else if (element.zone === "conversation") {
      assert.ok(element.x >= 1120 && element.x + element.width <= 1500, element.phrase);
      assert.ok(foot >= 565 && foot <= 585, element.phrase);
    }
  }
});

test("clock clears the shop plaque and stamp, biscuit and origami contact furniture", () => {
  const scene = compose([record("wake up your idea", 0), record("confirm plus chop", 1), record("orhor", 2), record("chim", 3)]);
  const motifs = new Map(scene.elements.map((element) => [element.phrase, element]));
  const clock = motifs.get("wake up your idea")!;
  assert.ok(clock.x > 575, "the clock must not cover the Singlish Loom sign");
  const stamp = motifs.get("confirm plus chop")!;
  assert.ok(stamp.x + stamp.width / 2 < 531 && stamp.y + stamp.height >= 357 && stamp.y + stamp.height <= 405);
  for (const phrase of ["orhor", "chim"]) {
    const motif = motifs.get(phrase)!;
    assert.ok(motif.x >= 1120 && motif.x + motif.width <= 1500);
    assert.ok(motif.y + motif.height >= 565 && motif.y + motif.height <= 585, `${phrase} rests on the bench seat`);
  }
});

test("appending a new phrase or repeat preserves every previous object's full layout", () => {
  const initial = [record("chope", 0), record("lepak", 1), ...Array.from({ length: 11 }, (_, index) => record("kanchiong spider", index + 2)), record("accepted new phrase", 13)];
  const before = compose(initial);
  const after = compose([...initial, record("kan chiong spider", 14), record("shiok", 15), record("another supported phrase", 16), record("accepted new phrase", 17)]);
  const afterById = byId(after.elements);
  for (const element of before.elements) assert.deepEqual(afterById.get(element.id), element);
  assert.equal(after.elements.length, before.elements.length + 4);
  assert.ok(after.height >= before.height);
  assert.deepEqual(compose([...initial].reverse()), before);
});

test("popular phrases retain every contribution past local prop and former wall caps", () => {
  const records = Array.from({ length: 420 }, (_, index) => record(CORPUS[index % 27].term, index));
  records.push(...Array.from({ length: 160 }, (_, index) => record("lepak", index + 420)));
  records.push(...Array.from({ length: 70 }, (_, index) => record("dictionary supported new term", index + 580)));
  const scene = compose(records);
  assert.equal(scene.elements.length, 650);
  assert.equal(new Set(scene.elements.map((element) => element.id)).size, 650);
  assert.ok(scene.height > 1000);
  assert.ok(scene.elements.every((element) => Number.isFinite(element.x) && Number.isFinite(element.y)
    && element.x >= 0 && element.x + element.width <= 1600 && element.y + element.height <= scene.height));
  const continuation = scene.elements.filter((element) => element.y >= 1040);
  assert.equal(new Set(continuation.map((element) => `${element.x},${element.y}`)).size, continuation.length);
  const after = compose([...records, record("dictionary supported new term", 650), record("atas", 651)]);
  const afterById = byId(after.elements);
  for (const element of scene.elements) assert.deepEqual(afterById.get(element.id), element);
});

test("new accepted phrases receive native meaningful fallback objects without a provider", () => {
  const scene = compose([record("lepak", 0), record("bo jio", 1), record("a new supported phrase", 2)]);
  const byPhrase = new Map(scene.elements.map((element) => [element.phrase, element]));
  assert.equal(byPhrase.get("lepak")?.fallbackKind, "stool");
  assert.equal(byPhrase.get("bo jio")?.fallbackKind, "tissue");
  assert.ok(scene.elements.every((element) => element.spriteIndex === null));
  assert.ok(scene.elements.every((element) => element.kind === "motif"));
  const first = byPhrase.get("a new supported phrase")!;
  assert.ok(first.y < 1000, "the first new phrase joins the shared shop");
  assert.equal(scene.height, 1000);
});

test("twelve new supported phrases and their first eight repeats stay in the shared room", () => {
  const records = Array.from({ length: 12 }, (_, phraseIndex) => Array.from({ length: 9 }, (_, ordinal) => record(`supported discovery ${phraseIndex}`, phraseIndex * 9 + ordinal))).flat();
  const scene = compose(records);
  assert.equal(scene.height, 1000, "new phrase art must not create a blank overflow street");
  assert.equal(scene.elements.length, records.length);
  const motifs = scene.elements.filter((element) => element.kind === "motif");
  assert.equal(new Set(motifs.map((element) => `${element.x},${element.y}`)).size, 12);
  for (const zone of ["counter", "table", "conversation", "street"]) assert.equal(motifs.filter((element) => element.zone === zone).length, 3);
  for (const element of motifs) {
    const foot = element.y + element.height;
    const centre = element.x + element.width / 2;
    if (element.zone === "counter") assert.ok(foot >= 357 && foot <= 405 && centre <= 505);
    if (element.zone === "table") assert.ok(((centre - 853) / 201) ** 2 + ((foot - 601) / 66) ** 2 <= 1);
    if (element.zone === "conversation") assert.ok(foot >= 565 && foot <= 585);
    if (element.zone === "street") assert.ok(foot >= 850 && foot <= 965);
  }
  assert.ok(scene.elements.every((element) => element.y + element.height < 1000));
});

test("the first excess phrase and ninth repeat extend just beyond the shop without relocating earlier objects", () => {
  const initial = Array.from({ length: 12 }, (_, index) => record(`supported discovery ${index}`, index));
  const before = compose(initial);
  const overflow = compose([...initial, record("supported discovery 12", 12)]);
  const afterById = byId(overflow.elements);
  for (const element of before.elements) assert.deepEqual(afterById.get(element.id), element);
  const excess = overflow.elements.find((element) => element.phrase === "supported discovery 12")!;
  assert.equal(excess.y, 1040, "the excess phrase arrives beside the shop rather than after an empty reserved band");
  assert.ok(overflow.height <= 1260);

  const repeated = compose(Array.from({ length: 10 }, (_, index) => record("supported discovery 0", index)));
  const ninth = repeated.elements.find((element) => element.ordinal === 9)!;
  assert.equal(ninth.y, 1040);
  assert.ok(repeated.height <= 1140);
  assert.equal(repeated.elements.length, 10);
});

console.log(`${checks} kopitiam scene checks passed.`);
