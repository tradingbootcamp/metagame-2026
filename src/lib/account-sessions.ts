import {
  formatPacificDay,
  formatPacificTime,
  type RsvpStatus,
  type ScheduleLocation,
  type ScheduleSession,
  type Status,
  type ViewerPlans,
} from "./schedule";

export type AccountSessionRow = {
  id: string;
  title: string;
  status: Status;
  /** "Sat, Nov 7 · 10:00 AM – 10:55 AM", or null while unscheduled. */
  when: string | null;
  room: string | null;
  /** Lead host, for the running list. */
  lead: boolean;
  rsvp: RsvpStatus | null;
  bookmarked: boolean;
  full: boolean;
};

export type AccountSessions = {
  running: AccountSessionRow[];
  plans: AccountSessionRow[];
  bookmarks: AccountSessionRow[];
};

export function sessionWhen(
  s: Pick<ScheduleSession, "startsAt" | "endsAt">,
): string | null {
  if (!s.startsAt) return null;
  const start = `${formatPacificDay(s.startsAt)} · ${formatPacificTime(s.startsAt)}`;
  return s.endsAt ? `${start} – ${formatPacificTime(s.endsAt)}` : start;
}

/** Scheduled first in time order, then unscheduled by title. */
function byTime(a: ScheduleSession, b: ScheduleSession): number {
  if (a.startsAt && b.startsAt && a.startsAt !== b.startsAt)
    return a.startsAt.localeCompare(b.startsAt);
  if (a.startsAt && !b.startsAt) return -1;
  if (!a.startsAt && b.startsAt) return 1;
  return a.title.localeCompare(b.title);
}

/**
 * The account page's session lists. Hosts see their own drafts; RSVPs and
 * bookmarks only count on published sessions, since that's all attendees see.
 */
export function accountSessions(
  userId: string,
  sessions: ScheduleSession[],
  locations: Pick<ScheduleLocation, "id" | "name">[],
  plans: ViewerPlans,
  goingCounts: Record<string, { going: number }>,
): AccountSessions {
  const rooms = new Map(locations.map((l) => [l.id, l.name]));
  const marked = new Set(plans.bookmarks);
  const row = (s: ScheduleSession): AccountSessionRow => ({
    id: s.id,
    title: s.title,
    status: s.status,
    when: sessionWhen(s),
    room: s.locationId ? (rooms.get(s.locationId) ?? null) : null,
    lead: s.hosts[0]?.userId === userId,
    rsvp: plans.rsvps[s.id] ?? null,
    bookmarked: marked.has(s.id),
    full:
      s.maxCapacity !== null &&
      (goingCounts[s.id]?.going ?? 0) >= s.maxCapacity,
  });
  const sorted = [...sessions].sort(byTime);
  const published = sorted.filter((s) => s.status === "published");
  return {
    running: sorted
      .filter((s) => s.hosts.some((h) => h.userId === userId))
      .map(row),
    plans: published.filter((s) => plans.rsvps[s.id]).map(row),
    bookmarks: published
      .filter((s) => marked.has(s.id) && !plans.rsvps[s.id])
      .map(row),
  };
}
