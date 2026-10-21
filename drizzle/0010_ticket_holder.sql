ALTER TABLE "tickets" ADD COLUMN "holder_user_id" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_holder_user_id_user_id_fk" FOREIGN KEY ("holder_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tickets_holder_user_id_idx" ON "tickets" USING btree ("holder_user_id");