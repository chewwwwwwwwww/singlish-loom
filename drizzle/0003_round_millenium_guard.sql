ALTER TABLE `threads` ADD `archived_at` integer;
--> statement-breakpoint
-- Historic phrases were stored after intake normalization. Remove only the
-- requested typo from public listings, retaining its saved thread and artwork.
UPDATE `threads`
SET `archived_at` = CAST(strftime('%s', 'now') AS integer) * 1000
WHERE `archived_at` IS NULL AND lower(trim(`phrase`)) = 'blur sotng';
