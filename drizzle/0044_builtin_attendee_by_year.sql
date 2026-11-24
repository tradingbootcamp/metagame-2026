-- The built-in Attendee role split by year; its row, with the permissions the team set, is the 2027 one.
UPDATE "roles" SET "name" = '2027 Attendee', "updated_at" = now()
WHERE lower("name") = 'attendee'
  AND NOT EXISTS (SELECT 1 FROM "roles" WHERE lower("name") = '2027 attendee');
