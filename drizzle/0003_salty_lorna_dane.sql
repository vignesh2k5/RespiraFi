ALTER TABLE `telemetry` ADD `fatigue` varchar(20) DEFAULT 'LOW' NOT NULL;--> statement-breakpoint
ALTER TABLE `telemetry` ADD `bpmTrend` varchar(20) DEFAULT 'FLAT' NOT NULL;--> statement-breakpoint
ALTER TABLE `telemetry` ADD `mlConfidence` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `telemetry` ADD `modelVersion` varchar(60) DEFAULT 'respirafi-signal-model-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE `telemetry` ADD `exercise` varchar(100) DEFAULT 'General session' NOT NULL;