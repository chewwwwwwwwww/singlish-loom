import assert from "node:assert/strict";
import { canonicalCreativePhrase, resolvePhraseVariant } from "../lib/phrase-variants";

for (const phrase of ["your head", "YOUR HEAD LA!", "your head lah", "your head ah", "your-head-ah"]) {
  assert.equal(resolvePhraseVariant(phrase)?.entry.term, "your head", phrase);
}
for (const phrase of ["kan chiong spider", "kanchiong spide", "kancheong spider"]) {
  assert.equal(resolvePhraseVariant(phrase)?.entry.term, "kanchiong spider", phrase);
}
assert.equal(resolvePhraseVariant("blur sotng")?.entry.term, "blur sotong");
assert.equal(resolvePhraseVariant("blur sotng")?.resolution, "spelling");
assert.equal(resolvePhraseVariant("can ah"), null);
assert.equal(resolvePhraseVariant("no shiok"), null);
assert.equal(resolvePhraseVariant("your heart lah"), null);
assert.equal(resolvePhraseVariant("totally invented kopi mood"), null);
assert.equal(canonicalCreativePhrase("kopi moon la!"), "kopi moon lah");
assert.equal(canonicalCreativePhrase("kopi moon ah"), "kopi moon ah");
console.log("Phrase variants: known aliases and small typos share canonical terms; distinct phrases remain distinct.");
