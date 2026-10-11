CREATE TABLE `artwork_budgets` (
	`day` text PRIMARY KEY NOT NULL,
	`used` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `artworks` (
	`id` text PRIMARY KEY NOT NULL,
	`phrase` text NOT NULL,
	`style_version` text NOT NULL,
	`status` text NOT NULL,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`retry_after` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`object_key` text,
	`mime_type` text,
	`byte_length` integer,
	`alt` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `threads` ADD `artwork` text;