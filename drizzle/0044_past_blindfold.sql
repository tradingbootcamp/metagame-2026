ALTER TABLE "tickets" ADD COLUMN "voided" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "voided_by" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "unvoided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "unvoided_by" text;