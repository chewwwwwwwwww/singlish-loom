export type VoiceMode = "story" | "lyric";
export type GenerationMode = "demo" | "live" | "prepared";

export interface LoomArtwork {
  url: string;
  alt: string;
  provider: "studio" | "gemini";
  cached: boolean;
}

// SQL NULL belongs to records created before artwork existed. New records
// preserve an explicit unavailable snapshot so their shared artwork stays fixed.
export type StoredArtwork = LoomArtwork | { unavailable: true };

export interface LoomRecord {
  id: string;
  phrase: string;
  meaning: string;
  myth: string;
  voice: string;
  voiceMode: VoiceMode;
  verified: boolean;
  source: string | null;
  sourceUrl: string | null;
  createdAt: number;
  palette: number;
  mode: GenerationMode;
  artwork?: LoomArtwork | null;
}

export interface WallResponse {
  records: LoomRecord[];
  total: number;
  mode: GenerationMode;
}

export interface TapestryThread {
  id: string;
  phrase: string;
  palette: number;
  createdAt: number;
}

export interface TapestryResponse {
  records: TapestryThread[];
  total: number;
}

// The shared mural needs existing illustrations and their checked meanings,
// while full creative writing remains on the saved thread endpoint.
export interface MuralContribution extends TapestryThread {
  meaning: string;
  verified: boolean;
  source: string | null;
  sourceUrl: string | null;
  artwork: LoomArtwork | null;
}

export interface MuralResponse {
  records: MuralContribution[];
  total: number;
}

export interface StatusResponse {
  llm: boolean;
  model: string;
  durable: boolean;
  artwork?: boolean;
}

export interface CorpusTerm {
  term: string;
  meaning: string;
  verified: boolean;
  source: string | null;
  sourceUrl: string | null;
  aliases?: string[];
}

export interface PhraseSuggestion {
  phrase: string;
  meaning: string;
}

export interface AcceptedPhrase {
  accepted: true;
  phrase: string;
  meaning: string;
  verified: boolean;
  source: string | null;
  sourceUrl: string | null;
  availability: "prepared" | "live";
  provenance: "collection" | "reviewed" | "discovered";
}

export interface UnknownPhrase {
  accepted: false;
  code: "UNKNOWN_PHRASE" | "REFERENCE_UNAVAILABLE";
  error: string;
  phrase: string;
  suggestions: PhraseSuggestion[];
  retryable?: boolean;
}

export type PhraseCheckResponse = AcceptedPhrase | UnknownPhrase;
