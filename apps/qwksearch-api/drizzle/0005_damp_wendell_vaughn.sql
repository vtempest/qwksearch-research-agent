CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`cite` text,
	`author` text,
	`author_cite` text,
	`date` text,
	`source` text,
	`word_count` integer,
	`html` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
