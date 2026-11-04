-- Custom SQL migration file, put your code below! --
-- An ordinary role: once made it's edited, renamed or deleted on /backstage/roles like any other.
INSERT INTO "roles" ("name") VALUES ('Magnum Opus Admin') ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", 'magnum_opus.manage' FROM "roles" WHERE "name" = 'Magnum Opus Admin'
ON CONFLICT DO NOTHING;
