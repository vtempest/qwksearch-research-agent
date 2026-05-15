CREATE TABLE `articleCache` (
	`id` integer PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`cite` text,
	`author` text,
	`author_cite` text,
	`author_short` text,
	`author_type` text,
	`date` text,
	`source` text,
	`word_count` integer,
	`html` text,
	`followUpQuestions` text DEFAULT '[]',
	`hitCount` integer DEFAULT 0 NOT NULL,
	`lastAccessed` integer DEFAULT (unixepoch()) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`expiresAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articleCache_url_unique` ON `articleCache` (`url`);--> statement-breakpoint
CREATE TABLE `articleQA` (
	`id` integer PRIMARY KEY NOT NULL,
	`articleUrl` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`articleUrl`) REFERENCES `articleCache`(`url`) ON UPDATE no action ON DELETE no action
);
