CREATE TYPE "public"."unconference_note_color" AS ENUM('butter', 'rose', 'sky', 'mint', 'tangerine', 'lilac');--> statement-breakpoint
CREATE TABLE "unconference_note_reactions" (
	"note_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unconference_note_reactions_note_id_user_id_emoji_pk" PRIMARY KEY("note_id","user_id","emoji"),
	CONSTRAINT "unconference_note_reactions_emoji_length" CHECK (char_length("unconference_note_reactions"."emoji") > 0 AND char_length("unconference_note_reactions"."emoji") <= 32)
);
--> statement-breakpoint
CREATE TABLE "unconference_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"board_day" date NOT NULL,
	"session_id" uuid,
	"title" text,
	"sticky" jsonb DEFAULT '{"v":1,"items":[]}'::jsonb NOT NULL,
	"poster" jsonb DEFAULT '{"v":1,"items":[]}'::jsonb NOT NULL,
	"color" "unconference_note_color" NOT NULL,
	"x" real DEFAULT 0 NOT NULL,
	"y" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unconference_notes_sessionId_unique" UNIQUE("session_id"),
	CONSTRAINT "unconference_notes_title_length" CHECK ("unconference_notes"."title" is null OR char_length("unconference_notes"."title") <= 120),
	CONSTRAINT "unconference_notes_x_fraction" CHECK ("unconference_notes"."x" >= 0 AND "unconference_notes"."x" <= 1),
	CONSTRAINT "unconference_notes_y_fraction" CHECK ("unconference_notes"."y" >= 0 AND "unconference_notes"."y" <= 1)
);
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "board_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "board_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "unconference_note_reactions" ADD CONSTRAINT "unconference_note_reactions_note_id_unconference_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."unconference_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unconference_note_reactions" ADD CONSTRAINT "unconference_note_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unconference_notes" ADD CONSTRAINT "unconference_notes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unconference_notes" ADD CONSTRAINT "unconference_notes_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unconference_notes" ADD CONSTRAINT "unconference_notes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unconference_note_reactions_user_id_idx" ON "unconference_note_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "unconference_notes_location_id_idx" ON "unconference_notes" USING btree ("location_id","board_day");--> statement-breakpoint
CREATE INDEX "unconference_notes_author_user_id_idx" ON "unconference_notes" USING btree ("author_user_id");--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_board_window" CHECK ("locations"."board_ends_at" is null OR ("locations"."board_starts_at" is not null AND "locations"."board_ends_at" > "locations"."board_starts_at"));