CREATE TABLE `weeklyPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStartDate` timestamp NOT NULL,
	`targetDate` timestamp NOT NULL,
	`workoutType` varchar(40) NOT NULL,
	`title` varchar(160) NOT NULL,
	`muscleGroups` text NOT NULL,
	`exercises` text NOT NULL,
	`duration` int NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'PLANNED',
	`completionPercent` int,
	`completedAt` timestamp,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_plans_user_target_unique` UNIQUE(`userId`,`targetDate`)
);
--> statement-breakpoint
ALTER TABLE `weeklyPlans` ADD CONSTRAINT `weeklyPlans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `weekly_plans_user_week_date_idx` ON `weeklyPlans` (`userId`,`weekStartDate`,`targetDate`);