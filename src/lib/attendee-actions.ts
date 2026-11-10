// The one switch for what an attendee does to the schedule for themselves:
// RSVP, bookmark, pin a new note on the unconference board, react to one.
// Off now that Metagame 2026 is over; set it back to true to reopen them.
// Hosts editing their own sessions and notes are never gated on it.
export const ATTENDEE_ACTIONS_OPEN: boolean = false;

/** What a refused server action answers. */
export const ATTENDEE_ACTIONS_CLOSED =
  "Metagame 2026 is over, so RSVPs, bookmarks and the unconference board are closed.";

/** The schedule team (schedule.manage) keeps these whatever the switch says. */
export const attendeeActionsOpen = (isScheduleTeam: boolean): boolean =>
  ATTENDEE_ACTIONS_OPEN || isScheduleTeam;
