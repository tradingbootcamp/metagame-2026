ALTER TABLE "profiles" ADD COLUMN "wizard_level" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pirate_level" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "alien_level" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_wizard_level_range" CHECK ("profiles"."wizard_level" between 0 and 5);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_pirate_level_range" CHECK ("profiles"."pirate_level" between 0 and 5);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_alien_level_range" CHECK ("profiles"."alien_level" between 0 and 5);--> statement-breakpoint
INSERT INTO "profiles" ("user_id") SELECT u."id" FROM "user" u WHERE NOT EXISTS (SELECT 1 FROM "profiles" p WHERE p."user_id" = u."id");--> statement-breakpoint
UPDATE "profiles" p SET "wizard_level" = u."wizard_level", "pirate_level" = u."pirate_level", "alien_level" = u."alien_level" FROM "user" u WHERE u."id" = p."user_id";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_wizard_level_range";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_pirate_level_range";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_alien_level_range";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "wizard_level";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "pirate_level";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "alien_level";