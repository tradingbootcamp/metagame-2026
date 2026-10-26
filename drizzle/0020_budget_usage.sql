ALTER TABLE "budget_import_runs" ADD COLUMN "kind" text DEFAULT 'import' NOT NULL;--> statement-breakpoint
ALTER TABLE "budget_import_runs" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "budget_import_runs" ADD COLUMN "input_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "budget_import_runs" ADD COLUMN "output_tokens" integer DEFAULT 0 NOT NULL;