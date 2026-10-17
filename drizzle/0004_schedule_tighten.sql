-- Hand-written: 0003 had already run on the shared database when its tables
-- were tightened, so the changes land as ALTERs instead of a rewritten 0003.
ALTER TABLE "session_hosts" DROP CONSTRAINT "session_hosts_session_id_display_name_pk";--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "airtable_record_id" text;--> statement-breakpoint
ALTER TABLE "session_hosts" ADD COLUMN "position" integer;--> statement-breakpoint
UPDATE "session_hosts" h SET "position" = n."rn" FROM (SELECT ctid, row_number() OVER (PARTITION BY "session_id" ORDER BY "display_name") - 1 AS "rn" FROM "session_hosts") n WHERE h.ctid = n.ctid;--> statement-breakpoint
ALTER TABLE "session_hosts" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "session_hosts" ADD CONSTRAINT "session_hosts_session_id_position_pk" PRIMARY KEY("session_id","position");--> statement-breakpoint
CREATE INDEX "sessions_location_id_idx" ON "sessions" USING btree ("location_id");--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_airtableRecordId_unique" UNIQUE("airtable_record_id");--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_capacity_positive" CHECK ("locations"."capacity" > 0);--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_ends_after_start" CHECK ("sessions"."ends_at" > "sessions"."starts_at");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_published_timed" CHECK ("sessions"."status" = 'draft' OR ("sessions"."starts_at" IS NOT NULL AND "sessions"."ends_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_max_capacity_positive" CHECK ("sessions"."max_capacity" > 0);--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_min_within_max" CHECK ("sessions"."min_capacity" >= 0 AND "sessions"."min_capacity" <= "sessions"."max_capacity");
