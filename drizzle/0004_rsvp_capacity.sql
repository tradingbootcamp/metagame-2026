-- Refuses a 'going' RSVP once the session's going count reaches max_capacity
-- (null = unlimited). Locking the session row first serializes concurrent
-- RSVPs to one session, and each statement in a plpgsql function takes a fresh
-- snapshot, so the count sees whatever the previous lock holder committed.
CREATE FUNCTION rsvps_enforce_capacity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  cap integer;
  going integer;
BEGIN
  IF NEW.status <> 'going'
    OR (TG_OP = 'UPDATE' AND OLD.status = 'going' AND OLD.session_id = NEW.session_id)
  THEN
    RETURN NEW;
  END IF;
  SELECT max_capacity INTO cap FROM sessions
    WHERE id = NEW.session_id FOR NO KEY UPDATE;
  IF cap IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO going FROM rsvps
    WHERE session_id = NEW.session_id AND status = 'going';
  IF going >= cap THEN
    RAISE EXCEPTION 'session % is full', NEW.session_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'rsvps_capacity';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER rsvps_capacity
  BEFORE INSERT OR UPDATE OF status, session_id ON rsvps
  FOR EACH ROW EXECUTE FUNCTION rsvps_enforce_capacity();
