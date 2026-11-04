-- Custom SQL migration file, put your code below! --
-- /backstage/magnum-opus finds this role by name, so the name and this permission are fixed; it's otherwise assigned and extended like any role.
INSERT INTO "roles" ("name") VALUES ('Magnum Opus Admin') ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", 'magnum_opus.manage' FROM "roles" WHERE "name" = 'Magnum Opus Admin'
ON CONFLICT DO NOTHING;
