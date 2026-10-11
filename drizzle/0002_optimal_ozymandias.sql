CREATE TABLE `phrase_references` (
	`lookup_phrase` text PRIMARY KEY NOT NULL,
	`compact_phrase` text NOT NULL,
	`status` text NOT NULL,
	`phrase` text,
	`meaning` text,
	`source` text,
	`source_url` text,
	`revision` integer,
	`checked_at` integer NOT NULL,
	`retry_after` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `phrase_references_compact_idx` ON `phrase_references` (`compact_phrase`);--> statement-breakpoint
CREATE TABLE `reference_budgets` (
	`day` text PRIMARY KEY NOT NULL,
	`used` integer NOT NULL
);
