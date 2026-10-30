CREATE TABLE "team_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_areas_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "team_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'volunteer' NOT NULL,
	"area_id" uuid,
	"user_id" text,
	"contact" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_people_name_unique" UNIQUE("name"),
	CONSTRAINT "team_people_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "team_role_people" (
	"role_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"stake" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_role_people_role_id_person_id_pk" PRIMARY KEY("role_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "team_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"area_id" uuid,
	"lead_id" uuid,
	"description" text,
	"skills" text,
	"needed" integer DEFAULT 1 NOT NULL,
	"due" text,
	"due_on" date,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_roles_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "team_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"area_id" uuid,
	"role_id" uuid,
	"owner_id" uuid,
	"status" text DEFAULT 'todo' NOT NULL,
	"due_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_people" ADD CONSTRAINT "team_people_area_id_team_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."team_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_people" ADD CONSTRAINT "team_people_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_role_people" ADD CONSTRAINT "team_role_people_role_id_team_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."team_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_role_people" ADD CONSTRAINT "team_role_people_person_id_team_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."team_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_roles" ADD CONSTRAINT "team_roles_area_id_team_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."team_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_roles" ADD CONSTRAINT "team_roles_lead_id_team_people_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."team_people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_tasks" ADD CONSTRAINT "team_tasks_area_id_team_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."team_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_tasks" ADD CONSTRAINT "team_tasks_role_id_team_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."team_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_tasks" ADD CONSTRAINT "team_tasks_owner_id_team_people_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."team_people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_role_people_person_id_idx" ON "team_role_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "team_tasks_owner_id_idx" ON "team_tasks" USING btree ("owner_id");