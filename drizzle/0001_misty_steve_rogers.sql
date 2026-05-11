CREATE TABLE `analysisSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`uploadedImageUrl` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`intakeGoal` varchar(64),
	`intakeNiche` varchar(255),
	`intakeRiskTolerance` varchar(64),
	`domainCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analyzedDomains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`domainName` varchar(255) NOT NULL,
	`trustFlow` int,
	`citationFlow` int,
	`majTopics` text,
	`age` int,
	`szScore` int,
	`redirects` int,
	`parked` int,
	`drops` int,
	`googleIndex` int,
	`outLinksExternal` int,
	`semRank` int,
	`price` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyzedDomains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domainRecommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`domainId` int NOT NULL,
	`rank` int NOT NULL,
	`score` int NOT NULL,
	`reasoning` text NOT NULL,
	`sherlockAnalysis` text NOT NULL,
	`dueDiligenceChecklist` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `domainRecommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`namecheapApiKey` varchar(255),
	`namecheapUsername` varchar(255),
	`godaddyApiKey` varchar(255),
	`godaddyApiSecret` varchar(255),
	`porkbunApiKey` varchar(255),
	`porkbunSecretKey` varchar(255),
	`notificationsEnabled` int NOT NULL DEFAULT 1,
	`onboardingCompleted` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`domainName` varchar(255) NOT NULL,
	`notes` text,
	`trustFlow` int,
	`citationFlow` int,
	`szScore` int,
	`majTopics` text,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `tier` enum('free','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `analysisCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `analysisSessions` ADD CONSTRAINT `analysisSessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analyzedDomains` ADD CONSTRAINT `analyzedDomains_sessionId_analysisSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `analysisSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `domainRecommendations` ADD CONSTRAINT `domainRecommendations_sessionId_analysisSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `analysisSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `domainRecommendations` ADD CONSTRAINT `domainRecommendations_domainId_analyzedDomains_id_fk` FOREIGN KEY (`domainId`) REFERENCES `analyzedDomains`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userSettings` ADD CONSTRAINT `userSettings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlist` ADD CONSTRAINT `watchlist_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;