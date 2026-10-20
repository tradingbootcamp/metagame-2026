ALTER TABLE "locations" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_image_url_https" CHECK ("locations"."image_url" like 'https://%');