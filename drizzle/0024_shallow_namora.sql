ALTER TABLE "user" ADD COLUMN "wizard_level" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pirate_level" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "alien_level" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_wizard_level_range" CHECK ("user"."wizard_level" between 0 and 5);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_pirate_level_range" CHECK ("user"."pirate_level" between 0 and 5);--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_alien_level_range" CHECK ("user"."alien_level" between 0 and 5);