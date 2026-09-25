CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deviceId` varchar(80) NOT NULL,
	`bpm` int NOT NULL,
	`speed` double NOT NULL,
	`movement` double NOT NULL,
	`duration` int NOT NULL,
	`intensity` int NOT NULL,
	`status` varchar(20) NOT NULL,
	`message` text NOT NULL,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`age` int NOT NULL,
	`height` int NOT NULL,
	`weight` int NOT NULL,
	`gender` varchar(80) NOT NULL,
	`fitnessLevel` varchar(40) NOT NULL,
	`activityLevel` varchar(40) NOT NULL,
	`goal` varchar(80) NOT NULL,
	`dietaryPreference` varchar(100) NOT NULL,
	`workoutPreference` varchar(100) NOT NULL,
	`availableTime` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulator` (
	`id` int NOT NULL,
	`deviceId` varchar(80) NOT NULL,
	`connected` int NOT NULL,
	`running` int NOT NULL,
	`mode` varchar(30) NOT NULL,
	`intensityTarget` int NOT NULL,
	`duration` int NOT NULL,
	`workoutState` varchar(30) NOT NULL,
	`workoutStartedAt` varchar(40) NOT NULL,
	`led` int NOT NULL,
	`buzzer` int NOT NULL,
	`lastTelemetryId` int,
	CONSTRAINT `simulator_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telemetry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(80) NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`bpm` int NOT NULL,
	`speed` double NOT NULL,
	`movement` double NOT NULL,
	`duration` int NOT NULL,
	`intensity` int NOT NULL,
	`status` varchar(20) NOT NULL,
	CONSTRAINT `telemetry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp NOT NULL,
	`duration` int NOT NULL,
	`averageBpm` int NOT NULL,
	`peakBpm` int NOT NULL,
	`averageSpeed` double NOT NULL,
	`averageMovement` double NOT NULL,
	`averageIntensity` int NOT NULL,
	`peakIntensity` int NOT NULL,
	`alertCount` int NOT NULL,
	`status` varchar(20) NOT NULL,
	CONSTRAINT `workouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(16) NOT NULL DEFAULT 'user';