CREATE TYPE "public"."discord_status" AS ENUM('not_yet', 'needs_role', 'session_host', 'refused');--> statement-breakpoint
CREATE TYPE "public"."megagame_interest" AS ENUM('not_a_fit', 'neutral', 'willing', 'excited', 'full_proposal');--> statement-breakpoint
CREATE TYPE "public"."session_dropins" AS ENUM('welcome', 'full_block', 'spectate', 'other');--> statement-breakpoint
CREATE TYPE "public"."session_phase" AS ENUM('grading', 'deciding', 'notifying', 'shepherding', 'scheduling', 'ready', 'declined');--> statement-breakpoint
CREATE TYPE "public"."session_verdict" AS ENUM('confirmed', 'probably', 'needs_follow_up', 'unconference_schedule', 'unlikely', 'rejected', 'na');--> statement-breakpoint
CREATE TYPE "public"."speaker_tier" AS ENUM('free_ticket_flights_housing', 'free_ticket_flights', 'free_ticket', 'no_comp');--> statement-breakpoint
CREATE TYPE "public"."potential_panel" AS ENUM('professional_gm', 'game_publishers', 'serious_games', 'dungeon_talk_show');--> statement-breakpoint
CREATE TYPE "public"."rubric_grade" AS ENUM('best', 'good', 'meh', 'bad', 'unclear');--> statement-breakpoint
CREATE TYPE "public"."shepherd_match" AS ENUM('positive', 'neutral', 'negative', 'other');--> statement-breakpoint
CREATE TYPE "public"."topic_area" AS ENUM('board_games', 'card_games', 'ttrpgs', 'larps', 'word_puzzles', 'number_puzzles', 'puzzle_hunts', 'escape_rooms', 'video_games', 'physical_games', 'party_game', 'immersive_experience');--> statement-breakpoint
CREATE TABLE "session_grade_space_options" (
	"grade_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	CONSTRAINT "session_grade_space_options_grade_id_location_id_pk" PRIMARY KEY("grade_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "session_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"grader_user_id" text NOT NULL,
	"operational_ease" "rubric_grade",
	"host_competence" "rubric_grade",
	"host_name_recognition" "rubric_grade",
	"subject_matter" "rubric_grade",
	"fun" "rubric_grade",
	"verdict_recommendation" "session_verdict",
	"quality_notes" text,
	"scheduler_notes" text,
	"shepherd_match" "shepherd_match",
	"topic_areas" "topic_area"[] DEFAULT '{}' NOT NULL,
	"potential_panels" "potential_panel"[] DEFAULT '{}' NOT NULL,
	"megagame_integration" text,
	"expected_crowd_size" integer,
	"allow_dropins" "session_dropins",
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_grades_session_grader_unique" UNIQUE("session_id","grader_user_id"),
	CONSTRAINT "session_grades_expected_crowd_size_nonnegative" CHECK ("session_grades"."expected_crowd_size" >= 0)
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "phase" "session_phase";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "verdict" "session_verdict";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "speaker_tier" "speaker_tier";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "requested_duration" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "cohosts" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "timing_constraints" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "other_constraints" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "age_elaboration" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "application_required" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "bespoke_needs" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "anything_else" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "megagame_interest" "megagame_interest";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "marketing_consent" boolean;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "discord_status" "discord_status";--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "megagame_notes" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ticket_state" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "housing_status" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "communication_notes" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ricki_notes" text;--> statement-breakpoint
ALTER TABLE "session_grade_space_options" ADD CONSTRAINT "session_grade_space_options_grade_id_session_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."session_grades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_grade_space_options" ADD CONSTRAINT "session_grade_space_options_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_grades" ADD CONSTRAINT "session_grades_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_grades" ADD CONSTRAINT "session_grades_grader_user_id_user_id_fk" FOREIGN KEY ("grader_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_grade_space_options_location_id_idx" ON "session_grade_space_options" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "session_grades_grader_user_id_idx" ON "session_grades" USING btree ("grader_user_id");