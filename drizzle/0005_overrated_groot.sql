ALTER TABLE `alerts` ADD `userId` int NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `userId` int NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `userId` int NULL;--> statement-breakpoint
ALTER TABLE `simulator` ADD `userId` int NULL;--> statement-breakpoint
ALTER TABLE `telemetry` ADD `userId` int NULL;--> statement-breakpoint
ALTER TABLE `workouts` ADD `userId` int NULL;--> statement-breakpoint
UPDATE `alerts` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `conversations` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `profiles` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `simulator` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `telemetry` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
UPDATE `workouts` SET `userId` = 1 WHERE `userId` IS NULL;--> statement-breakpoint
ALTER TABLE `alerts` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `simulator` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `telemetry` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `workouts` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulator` ADD CONSTRAINT `simulator_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telemetry` ADD CONSTRAINT `telemetry_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workouts` ADD CONSTRAINT `workouts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `alerts_user_created_at_idx` ON `alerts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `conversations_user_created_at_idx` ON `conversations` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `simulator_user_id_idx` ON `simulator` (`userId`);--> statement-breakpoint
CREATE INDEX `telemetry_user_recorded_at_idx` ON `telemetry` (`userId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `workouts_user_ended_at_idx` ON `workouts` (`userId`,`endedAt`);--> statement-breakpoint
