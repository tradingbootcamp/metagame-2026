CREATE TABLE "budget_proposal_verdicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"xero_id" text NOT NULL,
	"model" text NOT NULL,
	"verdict" jsonb,
	"error" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"picked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
