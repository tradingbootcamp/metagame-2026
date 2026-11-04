CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tokens_delta" integer DEFAULT 0 NOT NULL,
	"loan_delta" integer DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "token_ledger_kind" CHECK ("token_ledger"."kind" in ('loan', 'adjustment')),
	CONSTRAINT "token_ledger_changes_something" CHECK ("token_ledger"."tokens_delta" <> 0 or "token_ledger"."loan_delta" <> 0)
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "loan_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "token_ledger_user_id_created_at_idx" ON "token_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "token_ledger_created_at_idx" ON "token_ledger" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_loan_tokens_nonnegative" CHECK ("user"."loan_tokens" >= 0);