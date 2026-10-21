// Schedule types and time math shared by the server loaders and the client
// grid. Everything here is plain data: no database imports, so client
// components can use it. Times are stored UTC and shown in Pacific, the
// conference's zone.

export const CATEGORIES = ["talk", "workshop", "game", "other"] as const;
export const AGES = ["all", "kids", "adults"] as const;
export const STATUSES = ["draft", "published"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Ages = (typeof AGES)[number];
export type Status = (typeof STATUSES)[number];

export type ScheduleLocation = {
  id: string;
  name: string;
  capacity: number | null;
  campusLocation: string | null;
  description: string | null;
  displayOrder: number;
  showInSchedule: boolean;
  /** Public Vercel Blob URL, already thumbnail-sized. */
  thumbnailUrl: string | null;
  /** Public Vercel Blob URL, about 1600px, for detail views. */
  imageUrl: string | null;
};

export type ScheduleSession = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: Category | null;
  /** ISO strings; both null while a draft is unplaced. */
  startsAt: string | null;
  endsAt: string | null;
  locationId: string | null;
  maxCapacity: number | null;
  minCapacity: number | null;
  ages: Ages | null;
  needs: string | null;
  status: Status;
  /** The Airtable RFP Submissions row this came from. */
  airtableRfpRecordId: string | null;
  /** Billing order, lead first. */
  hosts: ScheduleAccount[];
};

export type ScheduleAccount = {
  userId: string;
  /** Preferred name, else account name, else email. */
  name: string;
  email: string;
};

export const RSVP_STATUSES = ["going", "waitlist"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export type Attendee = ScheduleAccount & { status: RsvpStatus };

/** Who's coming to each session, for organizers. Keyed by session id. */
export type Attendance = Record<
  string,
  { attendees: Attendee[]; bookmarks: number }
>;

/** The signed-in viewer's own RSVPs and bookmarks. */
export type ViewerPlans = {
  rsvps: Record<string, RsvpStatus>;
  bookmarks: string[];
};

/** One session's RSVPs as the public page may show them. */
export type SessionRsvps = {
  going: number;
  waitlist: number;
  /** Null unless the viewer may see who's coming. */
  names: { going: string[]; waitlist: string[] } | null;
};

/** Counts for everyone; names only when `showNames`. Rows earliest first. */
export function summarizeRsvps(
  rows: { status: RsvpStatus; name: string }[],
  showNames: boolean,
): SessionRsvps {
  const going = rows.filter((r) => r.status === "going").map((r) => r.name);
  const waitlist = rows
    .filter((r) => r.status === "waitlist")
    .map((r) => r.name);
  return {
    going: going.length,
    waitlist: waitlist.length,
    names: showNames ? { going, waitlist } : null,
  };
}

export function hostNames(session: { hosts: { name: string }[] }): string {
  return session.hosts.map((h) => h.name).join(", ");
}

export const CONFERENCE_DAYS = [
  { key: "2026-11-06", name: "Friday", dateLabel: "Nov 6" },
  { key: "2026-11-07", name: "Saturday", dateLabel: "Nov 7" },
  { key: "2026-11-08", name: "Sunday", dateLabel: "Nov 8" },
] as const;

export const PACIFIC = "America/Los_Angeles";

const wallFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type Wall = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function pacificParts(date: Date): Wall {
  const o: Record<string, number> = {};
  for (const p of wallFormat.formatToParts(date)) {
    if (p.type !== "literal") o[p.type] = Number(p.value);
  }
  // Some ICU builds print midnight as 24.
  return {
    year: o.year,
    month: o.month,
    day: o.day,
    hour: o.hour % 24,
    minute: o.minute,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-06" in Pacific time. */
export function pacificDayKey(iso: string): string {
  const p = pacificParts(new Date(iso));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes since Pacific midnight. */
export function pacificMinutes(iso: string): number {
  const p = pacificParts(new Date(iso));
  return p.hour * 60 + p.minute;
}

/** The datetime-local value ("2026-11-06T14:00") for an instant, in Pacific. */
export function toPacificWall(iso: string): string {
  const p = pacificParts(new Date(iso));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * The instant a Pacific wall-clock time names, or null if malformed. Two
 * correction passes so a time near a DST switch lands on the right offset.
 */
export function fromPacificWall(wall: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wall.trim());
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = pacificParts(new Date(guess));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += target - shown;
  }
  const date = new Date(guess);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPacificTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatPacificDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function slotLabel(slotStart: number): string {
  const h = Math.floor(slotStart / 60);
  const m = slotStart % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${period}`;
}

/** "14:30" from minutes since midnight. */
export function minutesToHHMM(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

// Sessions start on the hour or half hour and end five minutes before the
// next half hour, leaving a passing period.
export const END_GAP_MINUTES = 5;

// Schedule hours: from 10am (Friday 2pm) to midnight. Nothing runs outside them.
const OPENS_AT = 10 * 60;
const DAY_OPENS_AT: Record<string, number> = { "2026-11-06": 14 * 60 };
const CLOSES_AT = 24 * 60;

export function opensAt(dayKey: string): number {
  return DAY_OPENS_AT[dayKey] ?? OPENS_AT;
}

export function startTimes(dayKey: string): number[] {
  const out: number[] = [];
  for (let m = opensAt(dayKey); m < CLOSES_AT; m += 30) out.push(m);
  return out;
}

export function endTimes(dayKey: string): number[] {
  return startTimes(dayKey).map((m) => m + 30 - END_GAP_MINUTES);
}

/** Why a session at these times falls outside schedule hours, or null. */
export function outsideHours(
  startsAt: Date,
  endsAt: Date,
): { field: "startsAt" | "endsAt"; error: string } | null {
  const iso = startsAt.toISOString();
  const day = pacificDayKey(iso);
  const start = pacificMinutes(iso);
  if (start < opensAt(day)) {
    return {
      field: "startsAt",
      error: `Sessions that day start at ${slotLabel(opensAt(day))} or later.`,
    };
  }
  const end = start + (endsAt.getTime() - startsAt.getTime()) / 60_000;
  if (end > CLOSES_AT)
    return { field: "endsAt", error: "Sessions end by midnight." };
  return null;
}

// Grid geometry, matching the 2025 schedule component.
const PX_PER_MIN = 2;
export const SLOT_MINUTES = 30;
export const SLOT_PX = SLOT_MINUTES * PX_PER_MIN;

type Timed = Pick<ScheduleSession, "startsAt" | "endsAt">;

/** A session with both times set; the grid only places these. */
export type Placed<S extends Timed> = S & { startsAt: string; endsAt: string };
export type PlacedSession = Placed<ScheduleSession>;

export function isPlaced<S extends Timed>(s: S): s is Placed<S> {
  return s.startsAt !== null && s.endsAt !== null;
}

export function offsetPx(session: Placed<Timed>, slotStart: number): number {
  return Math.max(0, pacificMinutes(session.startsAt) - slotStart) * PX_PER_MIN;
}

export function heightPx(session: Placed<Timed>): number {
  const dur = pacificMinutes(session.endsAt) - pacificMinutes(session.startsAt);
  return Math.max(SLOT_PX, dur * PX_PER_MIN);
}

export function startsInSlot(
  session: Placed<Timed>,
  slotStart: number,
): boolean {
  const m = pacificMinutes(session.startsAt);
  return m >= slotStart && m < slotStart + SLOT_MINUTES;
}

/** An unplaced draft dropped on the grid gets an hour, ending on the passing period. */
export const DEFAULT_DRAFT_MINUTES = 60;

type Times = Pick<ScheduleSession, "startsAt" | "endsAt">;

/** Where a session lands when moved to start at `start`: its length kept, or the draft default. */
export function movedTimes(
  session: Times,
  start: Date,
): { startsAt: Date; endsAt: Date } {
  const ms =
    session.startsAt && session.endsAt
      ? Date.parse(session.endsAt) - Date.parse(session.startsAt)
      : (DEFAULT_DRAFT_MINUTES - END_GAP_MINUTES) * 60_000;
  return { startsAt: start, endsAt: new Date(start.getTime() + ms) };
}

/** The session already in that room at that time, if any. "No room" never clashes. */
export function findClash<S extends ScheduleSession>(
  sessions: S[],
  move: { id: string; locationId: string | null; startsAt: Date; endsAt: Date },
): S | null {
  if (move.locationId === null) return null;
  return (
    sessions.find(
      (s) =>
        s.id !== move.id &&
        s.locationId === move.locationId &&
        isPlaced(s) &&
        Date.parse(s.startsAt) < move.endsAt.getTime() &&
        Date.parse(s.endsAt) > move.startsAt.getTime(),
    ) ?? null
  );
}

/** Grid column id for placed sessions with no room. */
export const NO_ROOM = "__none__";

/** The sessions a grid cell draws: in that column, starting in that slot. */
export function cellSessions<S extends Timed & { locationId: string | null }>(
  sessions: Placed<S>[],
  columnId: string,
  slotStart: number,
): Placed<S>[] {
  return sessions.filter(
    (s) => (s.locationId ?? NO_ROOM) === columnId && startsInSlot(s, slotStart),
  );
}

export type Day<S extends Timed = ScheduleSession> = {
  key: string;
  name: string;
  dateLabel: string;
  sessions: Placed<S>[];
  /** 30-minute slot starts (minutes since Pacific midnight), open to midnight. */
  slots: number[];
};

/** The day's slots; reaches earlier only to show a session saved before opening. */
function daySlots(dayKey: string, sessions: Placed<Timed>[]): number[] {
  const earliest = Math.min(
    opensAt(dayKey),
    ...sessions.map((s) => pacificMinutes(s.startsAt)),
  );
  const first = earliest - (earliest % SLOT_MINUTES);
  const out: number[] = [];
  for (let m = first; m < CLOSES_AT; m += SLOT_MINUTES) out.push(m);
  return out;
}

/**
 * Buckets placed sessions by Pacific day. The three conference days always
 * appear, in order; any other day a session lands on is appended after them
 * so nothing is hidden from the editor.
 */
export function buildDays<S extends Timed>(sessions: S[]): Day<S>[] {
  const placed = sessions
    .filter((s): s is Placed<S> => isPlaced(s))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const byKey = new Map<string, Placed<S>[]>();
  for (const s of placed) {
    const key = pacificDayKey(s.startsAt);
    byKey.set(key, [...(byKey.get(key) ?? []), s]);
  }

  const days: Omit<Day<S>, "sessions" | "slots">[] = [...CONFERENCE_DAYS];
  for (const key of [...byKey.keys()].sort()) {
    if (days.some((d) => d.key === key)) continue;
    const iso = byKey.get(key)![0].startsAt;
    days.push({
      key,
      name: new Intl.DateTimeFormat("en-US", {
        timeZone: PACIFIC,
        weekday: "long",
      }).format(new Date(iso)),
      dateLabel: new Intl.DateTimeFormat("en-US", {
        timeZone: PACIFIC,
        month: "short",
        day: "numeric",
      }).format(new Date(iso)),
    });
  }

  return days.map((day) => {
    const sessions = byKey.get(day.key) ?? [];
    return { ...day, sessions, slots: daySlots(day.key, sessions) };
  });
}

/** What the public schedule may show of a session: published only, hosts without emails. */
export type PublicSession = Pick<
  ScheduleSession,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "category"
  | "locationId"
  | "maxCapacity"
  | "ages"
> & { startsAt: string; endsAt: string; hosts: { name: string }[] };

export type PublicLocation = Pick<
  ScheduleLocation,
  "id" | "name" | "capacity" | "campusLocation" | "thumbnailUrl" | "imageUrl"
>;

/**
 * The published, placed sessions and the rooms to show them in: every room
 * marked for the schedule, plus any other room a published session uses so
 * nothing published goes missing.
 */
export function publicSchedule(schedule: {
  locations: ScheduleLocation[];
  sessions: ScheduleSession[];
}): { locations: PublicLocation[]; sessions: PublicSession[] } {
  const sessions: PublicSession[] = schedule.sessions
    .filter((s) => s.status === "published")
    .filter(isPlaced)
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      category: s.category,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      locationId: s.locationId,
      maxCapacity: s.maxCapacity,
      ages: s.ages,
      hosts: s.hosts.map((h) => ({ name: h.name })),
    }));
  const used = new Set(sessions.map((s) => s.locationId));
  const locations = schedule.locations
    .filter((l) => l.showInSchedule || used.has(l.id))
    .map((l) => ({
      id: l.id,
      name: l.name,
      capacity: l.capacity,
      campusLocation: l.campusLocation,
      thumbnailUrl: l.thumbnailUrl,
      imageUrl: l.imageUrl,
    }));
  return { locations, sessions };
}

/** "my-session-title" from "My Session Title!", capped so slugs stay short. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
