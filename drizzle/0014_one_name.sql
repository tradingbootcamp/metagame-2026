-- Custom SQL migration file, put your code below! --
UPDATE "user" SET "name" = trim(p."preferred_name"), "updated_at" = now()
FROM "profiles" p
WHERE p."user_id" = "user"."id"
	AND nullif(trim(p."preferred_name"), '') IS NOT NULL
	AND trim(p."preferred_name") <> trim("user"."name");
