import type { LoomRecord } from "./types";

export const DICTIONARY_LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/";
export function hasDictionaryMeaning(record: Pick<LoomRecord, "sourceUrl">): boolean {
  try { return new URL(record.sourceUrl || "").hostname === "en.wiktionary.org"; }
  catch { return false; }
}
