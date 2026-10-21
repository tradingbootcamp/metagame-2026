ALTER TABLE "profiles" ADD COLUMN "bringing_children" boolean;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "share_with_recruiters" boolean;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "purchaser_discord" text;