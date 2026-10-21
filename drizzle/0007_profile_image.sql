ALTER TABLE "profiles" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_image_url_https" CHECK ("profiles"."image_url" like 'https://%');