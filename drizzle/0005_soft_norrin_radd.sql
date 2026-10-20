ALTER TABLE "session_hosts" DROP CONSTRAINT "session_hosts_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "session_hosts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "session_hosts" ADD CONSTRAINT "session_hosts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_hosts" DROP COLUMN "display_name";--> statement-breakpoint
ALTER TABLE "session_hosts" ADD CONSTRAINT "session_hosts_session_user_unique" UNIQUE("session_id","user_id");