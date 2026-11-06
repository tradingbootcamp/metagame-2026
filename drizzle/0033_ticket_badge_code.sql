ALTER TABLE "tickets" ADD COLUMN "badge_code" integer;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_badgeCode_unique" UNIQUE("badge_code");