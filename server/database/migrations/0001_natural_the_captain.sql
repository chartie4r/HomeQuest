CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`owner_id` text NOT NULL,
	`recurrence` text DEFAULT 'daily' NOT NULL,
	`anchor_date` text NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `routines_owner_id_idx` ON `routines` (`owner_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`routine_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`xp` integer NOT NULL,
	`points` integer NOT NULL,
	`steps` text DEFAULT '[]' NOT NULL,
	`estimated_minutes` integer,
	`one_time` integer DEFAULT false NOT NULL,
	`archived_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `tasks_routine_id_idx` ON `tasks` (`routine_id`);