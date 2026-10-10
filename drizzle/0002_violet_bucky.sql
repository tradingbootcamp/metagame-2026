CREATE TYPE "public"."ticket_source" AS ENUM('stripe', 'opennode', 'admin');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('pending', 'paid', 'failed', 'underpaid');--> statement-breakpoint
CREATE TABLE "tickets" (
	"payment_id" text PRIMARY KEY NOT NULL,
	"ticket_code" text NOT NULL,
	"source" "ticket_source" NOT NULL,
	"status" "ticket_status" NOT NULL,
	"test" boolean DEFAULT false NOT NULL,
	"tier" text,
	"amount_cents" integer,
	"purchaser_email" text,
	"purchaser_name" text,
	"owner_user_id" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_ticketCode_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tickets_purchaser_email_idx" ON "tickets" USING btree ("purchaser_email");--> statement-breakpoint
CREATE INDEX "tickets_owner_user_id_idx" ON "tickets" USING btree ("owner_user_id");