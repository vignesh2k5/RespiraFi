ALTER TABLE `simulator` ADD `pausedAt` varchar(40) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `simulator` ADD `pausedSeconds` int DEFAULT 0 NOT NULL;