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

export function hostNames(session: Pick<ScheduleSession, "hosts">): string {
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
export const START_TIMES: number[] = [];
for (let m = 0; m < 24 * 60; m += 30) START_TIMES.push(m);
export const END_TIMES = START_TIMES.map((m) => m + 30 - END_GAP_MINUTES);

// Grid geometry, matching the 2025 schedule component.
const PX_PER_MIN = 2;
export const SLOT_MINUTES = 30;
export const SLOT_PX = SLOT_MINUTES * PX_PER_MIN;

/** A session with both times set; the grid only places these. */
export type PlacedSession = ScheduleSession & {
  startsAt: string;
  endsAt: string;
};

export function isPlaced(s: ScheduleSession): s is PlacedSession {
  return s.startsAt !== null && s.endsAt !== null;
}

export function offsetPx(session: PlacedSession, slotStart: number): number {
  return Math.max(0, pacificMinutes(session.startsAt) - slotStart) * PX_PER_MIN;
}

export function heightPx(session: PlacedSession): number {
  const dur = pacificMinutes(session.endsAt) - pacificMinutes(session.startsAt);
  return Math.max(SLOT_PX, dur * PX_PER_MIN);
}

export function startsInSlot(
  session: PlacedSession,
  slotStart: number,
): boolean {
  const m = pacificMinutes(session.startsAt);
  return m >= slotStart && m < slotStart + SLOT_MINUTES;
}

export type Day = {
  key: string;
  name: string;
  dateLabel: string;
  sessions: PlacedSession[];
  /** 30-minute slot starts (minutes since Pacific midnight), all day. */
  slots: number[];
  /** Where the grid opens scrolled to; earlier hours are a scroll up. */
  opensAt: number;
};

// Friday opens in the evening.
const OPENS_AT = 9 * 60;
const DAY_OPENS_AT: Record<string, number> = { "2026-11-06": 17 * 60 };
const SLOTS: number[] = [];
for (let m = 0; m < 24 * 60; m += SLOT_MINUTES) SLOTS.push(m);

/**
 * Buckets placed sessions by Pacific day. The three conference days always
 * appear, in order; any other day a session lands on is appended after them
 * so nothing is hidden from the editor.
 */
export function buildDays(sessions: ScheduleSession[]): Day[] {
  const placed = sessions
    .filter(isPlaced)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const byKey = new Map<string, PlacedSession[]>();
  for (const s of placed) {
    const key = pacificDayKey(s.startsAt);
    byKey.set(key, [...(byKey.get(key) ?? []), s]);
  }

  const days: Omit<Day, "sessions" | "slots" | "opensAt">[] = [
    ...CONFERENCE_DAYS,
  ];
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

  return days.map((day) => ({
    ...day,
    sessions: byKey.get(day.key) ?? [],
    slots: SLOTS,
    opensAt: DAY_OPENS_AT[day.key] ?? OPENS_AT,
  }));
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
