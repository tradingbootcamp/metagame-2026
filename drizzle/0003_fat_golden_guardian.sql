CREATE TYPE "public"."rsvp_status" AS ENUM('going', 'waitlist');--> statement-breakpoint
CREATE TYPE "public"."session_ages" AS ENUM('all', 'kids', 'adults');--> statement-breakpoint
CREATE TYPE "public"."session_category" AS ENUM('talk', 'workshop', 'game', 'other');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"capacity" integer,
	"campus_location" text,
	"display_order" integer DEFAULT 100 NOT NULL,
	"show_in_schedule" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rsvps_session_id_user_id_pk" PRIMARY KEY("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "session_hosts" (
	"session_id" uuid NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	CONSTRAINT "session_hosts_session_id_display_name_pk" PRIMARY KEY("session_id","display_name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "session_category",
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"location_id" uuid,
	"max_capacity" integer,
	"min_capacity" integer,
	"ages" "session_ages",
	"needs" text,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"airtable_rfp_record_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "sessions_airtableRfpRecordId_unique" UNIQUE("airtable_rfp_record_id")
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_hosts" ADD CONSTRAINT "session_hosts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_hosts" ADD CONSTRAINT "session_hosts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_user_id_idx" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rsvps_user_id_idx" ON "rsvps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_hosts_user_id_idx" ON "session_hosts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_starts_at_idx" ON "sessions" USING btree ("starts_at");