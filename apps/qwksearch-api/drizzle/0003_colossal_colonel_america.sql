ALTER TABLE `chats` ADD `userId` text NOT NULL REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `messages` ADD `userId` text NOT NULL REFERENCES user(id);