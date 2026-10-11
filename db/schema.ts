import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { StoredArtwork } from "../lib/types";

export const threads = sqliteTable("threads", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().unique(),
  phrase: text("phrase").notNull(),
  meaning: text("meaning").notNull(),
  myth: text("myth").notNull(),
  voice: text("voice").notNull(),
  voiceMode: text("voice_mode", { enum: ["story", "lyric"] }).notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull(),
  source: text("source"),
  sourceUrl: text("source_url"),
  createdAt: integer("created_at").notNull(),
  palette: integer("palette").notNull(),
  mode: text("mode", { enum: ["demo", "live", "prepared"] }).notNull(),
  artwork: text("artwork", { mode: "json" }).$type<StoredArtwork>(),
  // A reversible event-wall removal preserves existing saved share links.
  archivedAt: integer("archived_at"),
}, (table) => [index("threads_created_at_idx").on(table.createdAt)]);

// A daily one-way client digest is saved; raw IP addresses are never saved.
export const submissionLimits = sqliteTable("submission_limits", {
  clientKey: text("client_key").primaryKey(),
  lastAt: integer("last_at").notNull(),
  requests: integer("requests").notNull(),
});

export const artworks = sqliteTable("artworks", {
  id: text("id").primaryKey(),
  phrase: text("phrase").notNull(),
  styleVersion: text("style_version").notNull(),
  status: text("status", { enum: ["pending", "ready", "failed"] }).notNull(),
  leaseToken: text("lease_token"),
  leaseUntil: integer("lease_until").notNull().default(0),
  retryAfter: integer("retry_after").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  objectKey: text("object_key"),
  mimeType: text("mime_type"),
  byteLength: integer("byte_length"),
  alt: text("alt"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const artworkBudgets = sqliteTable("artwork_budgets", {
  day: text("day").primaryKey(),
  used: integer("used").notNull(),
});

// Only the requested dictionary sense is stored, with its attributed revision.
// A short negative cache and lease bound repeated lookup/network work.
export const phraseReferences = sqliteTable("phrase_references", {
  lookupPhrase: text("lookup_phrase").primaryKey(),
  compactPhrase: text("compact_phrase").notNull(),
  status: text("status", { enum: ["pending", "ready", "missing", "unavailable"] }).notNull(),
  phrase: text("phrase"),
  meaning: text("meaning"),
  source: text("source"),
  sourceUrl: text("source_url"),
  revision: integer("revision"),
  checkedAt: integer("checked_at").notNull(),
  retryAfter: integer("retry_after").notNull().default(0),
  leaseToken: text("lease_token"),
  leaseUntil: integer("lease_until").notNull().default(0),
}, table => [index("phrase_references_compact_idx").on(table.compactPhrase)]);

export const referenceBudgets = sqliteTable("reference_budgets", {
  day: text("day").primaryKey(),
  used: integer("used").notNull(),
});
