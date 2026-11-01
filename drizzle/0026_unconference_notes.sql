CREATE TYPE "public"."location_layout" AS ENUM('grid', 'board');--> statement-breakpoint
CREATE TYPE "public"."unconference_note_color" AS ENUM('butter', 'rose', 'sky', 'mint', 'tangerine', 'lilac');--> statement-breakpoint
CREATE TABLE "unconference_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"color" "unconference_note_color" NOT NULL,
	"x" real DEFAULT 0 NOT NULL,
	"y" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unconference_notes_body_length" CHECK (char_length("unconference_notes"."body") > 0 AND char_length("unconference_notes"."body") <= 1000),
	CONSTRAINT "unconference_notes_x_fraction" CHECK ("unconference_notes"."x" >= 0 AND "unconference_notes"."x" <= 1),
	CONSTRAINT "unconference_notes_y_fraction" CHECK ("unconference_notes"."y" >= 0 AND "unconference_notes"."y" <= 1)
);
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "layout" "location_layout" DEFAULT 'grid' NOT NULL;--> statement-breakpoint
ALTER TABLE "unconference_notes" ADD CONSTRAINT "unconference_notes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unconference_notes" ADD CONSTRAINT "unconference_notes_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unconference_notes_location_id_idx" ON "unconference_notes" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "unconference_notes_author_user_id_idx" ON "unconference_notes" USING btree ("author_user_id");