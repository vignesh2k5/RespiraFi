ALTER TABLE `profiles` ADD `onboardingState` varchar(32) DEFAULT 'NEW_USER' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `onboardingStep` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `onboardingCompleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `onboardingCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `profiles` ADD `secondaryGoals` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `trainingFrequency` varchar(60);--> statement-breakpoint
ALTER TABLE `profiles` ADD `preferredWorkoutDuration` varchar(40);--> statement-breakpoint
ALTER TABLE `profiles` ADD `trainingEnvironment` varchar(40);--> statement-breakpoint
ALTER TABLE `profiles` ADD `availableEquipment` varchar(120);--> statement-breakpoint
ALTER TABLE `profiles` ADD `coachFocus` varchar(160);--> statement-breakpoint
ALTER TABLE `profiles` ADD `exercisePreferences` text;