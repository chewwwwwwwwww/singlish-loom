import assert from "node:assert/strict";
import { buildWeaveComposition, CLOTH, findThreadAt, isTapestryResponse, threadY } from "../lib/weave-composition.ts";

const records = Array.from({ length: 160 }, (_, index) => ({
  id: `saved-submission-${index}`, phrase: index % 2 ? "blur sotong" : "steady pom pi pi",
  palette: index % 6, createdAt: 1000 + index,
}));
const weave = buildWeaveComposition(records);
assert.equal(weave.length, 160, "every saved submission contributes, including older than the tile-wall limit");
assert.deepEqual(buildWeaveComposition([...records].reverse()), weave, "fetch order does not change the cloth");
assert.deepEqual(buildWeaveComposition(records), weave, "the same dataset makes identical geometry");
assert.deepEqual(buildWeaveComposition(records.slice(0, 8)), weave.slice(0, 8), "new arrivals never move existing yarn");
assert.equal(new Set(weave.map((thread) => `${thread.center}:${thread.phase}`)).size, 160, "repeated phrases still receive their own place");
assert.deepEqual(buildWeaveComposition([]), [], "the empty loom has no fake submissions");
assert.equal(buildWeaveComposition([records[0], records[0]]).length, 1, "duplicate API records cannot inflate the weave");
const changed = buildWeaveComposition([{ ...records[0], phrase: "chope" }])[0];
assert.notDeepEqual(changed.points, weave[0].points, "the words themselves change the curve");
assert.notEqual(changed.thickness, weave[0].thickness, "phrase length changes yarn breadth");
assert.equal(changed.knots.length, 1);
assert.equal(weave[0].knots.length, 4, "each word becomes a knot");
for (const thread of weave) {
  for (const point of thread.points) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(point.x >= CLOTH.left && point.x <= CLOTH.right);
    assert.ok(point.y >= CLOTH.top && point.y <= CLOTH.bottom, "every contribution stays inside the visible cloth");
  }
}
assert.equal(findThreadAt([weave[0]], { x: 300, y: threadY(weave[0], 300) })?.record.id, records[0].id);
assert.equal(findThreadAt(weave, { x: 20, y: 20 }), undefined);
assert.ok(isTapestryResponse({ records, total: records.length }));
assert.ok(!isTapestryResponse({ records, total: 161 }), "an incomplete dataset is kept off the all-voices artwork");
assert.ok(!isTapestryResponse({ records: [records[0], records[0]], total: 2 }));
assert.ok(!isTapestryResponse({ records: [{ ...records[0], palette: NaN }], total: 1 }));
console.log("✓ Collective weave: all 160 records, determinism, stable arrivals, phrase-driven material, bounds, hit testing and complete-feed validation");
