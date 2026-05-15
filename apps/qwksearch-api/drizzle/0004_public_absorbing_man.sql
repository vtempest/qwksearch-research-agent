PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chats` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`createdAt` text NOT NULL,
	`focusMode` text NOT NULL,
	`userId` text,
	`files` text DEFAULT '[]',
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_chats`("id", "title", "createdAt", "focusMode", "userId", "files") SELECT "id", "title", "createdAt", "focusMode", "userId", "files" FROM `chats`;--> statement-breakpoint
DROP TABLE `chats`;--> statement-breakpoint
ALTER TABLE `__new_chats` RENAME TO `chats`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`chatId` text NOT NULL,
	`userId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`messageId` text NOT NULL,
	`content` text,
	`sources` text DEFAULT '[]',
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "type", "chatId", "userId", "createdAt", "messageId", "content", "sources") SELECT "id", "type", "chatId", "userId", "createdAt", "messageId", "content", "sources" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;