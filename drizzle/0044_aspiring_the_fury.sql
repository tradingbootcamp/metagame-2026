CREATE TABLE "ticket_refunds" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "voided" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "voided_by" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "unvoided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "unvoided_by" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "refund_event_id" text;--> statement-breakpoint
CREATE INDEX "ticket_refunds_payment_id_idx" ON "ticket_refunds" USING btree ("payment_id");