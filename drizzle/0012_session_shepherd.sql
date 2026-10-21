ALTER TABLE "sessions" ADD COLUMN "shepherd_user_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_shepherd_user_id_user_id_fk" FOREIGN KEY ("shepherd_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_shepherd_user_id_idx" ON "sessions" USING btree ("shepherd_user_id");