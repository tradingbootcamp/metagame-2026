-- show_in_schedule said shown or hidden; rooms that were shown are public.
UPDATE "locations" SET "visibility" = 'public' WHERE "show_in_schedule";
