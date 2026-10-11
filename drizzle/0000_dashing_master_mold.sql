CREATE TABLE `submission_limits` (
	`client_key` text PRIMARY KEY NOT NULL,
	`last_at` integer NOT NULL,
	`requests` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`phrase` text NOT NULL,
	`meaning` text NOT NULL,
	`myth` text NOT NULL,
	`voice` text NOT NULL,
	`voice_mode` text NOT NULL,
	`verified` integer NOT NULL,
	`source` text,
	`source_url` text,
	`created_at` integer NOT NULL,
	`palette` integer NOT NULL,
	`mode` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `threads_request_id_unique` ON `threads` (`request_id`);--> statement-breakpoint
CREATE INDEX `threads_created_at_idx` ON `threads` (`created_at`);