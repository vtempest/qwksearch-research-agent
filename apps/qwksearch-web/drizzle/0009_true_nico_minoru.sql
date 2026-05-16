ALTER TABLE `chats` ADD `thinkingTimeLimit` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `trialAllowed` integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `apiKey` text;