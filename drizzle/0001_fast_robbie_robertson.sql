CREATE TABLE `queryAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int,
	`sql` text NOT NULL,
	`normalizedSql` text NOT NULL,
	`optimizedSql` text NOT NULL,
	`complexityLabel` varchar(16) NOT NULL,
	`baselineCost` int NOT NULL,
	`optimizedCost` int NOT NULL,
	`baselineLatencyMs` int NOT NULL,
	`optimizedLatencyMs` int NOT NULL,
	`analysisPayload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queryAnalyses_id` PRIMARY KEY(`id`)
);
