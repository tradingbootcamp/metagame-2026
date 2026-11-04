-- The Attendee role's `defaults` only apply when the role row is first made,
-- and it already exists, so the new permission is inserted here instead.
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", 'unconference.post' FROM "roles" WHERE lower("name") = 'attendee'
ON CONFLICT DO NOTHING;
