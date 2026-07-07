// Last year's (Metagame 2025) schedule, served from a committed static snapshot
// (`src/data/last-year-schedule.json`, pulled once from the 2025 Supabase). The
// conference is over, so the data never changes — no live DB dependency.
import rawData from "@/data/last-year-schedule.json";

export type Category = "talk" | "workshop" | "game" | "other";
export type Ages = "ALL" | "KIDS" | "ADULTS";

interface HostName {
  first_name: string | null;
  last_name: string | null;
}

export interface Session {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location_id: string | null;
  category: Category | null;
  ages: Ages | null;
  megagame: boolean;
  min_capacity: number | null;
  max_capacity: number | null;
  host_1: HostName | null;
  host_2: HostName | null;
  host_3: HostName | null;
  location: { name: string } | null;
}

export interface Location {
  id: string;
  name: string;
  campus_location: string | null;
  capacity: number | null;
  display_in_schedule: boolean;
  schedule_display_order: number;
  thumbnail_url: string | null;
}

interface Snapshot {
  sessions: Session[];
  locations: Location[];
}

const data = rawData as unknown as Snapshot;

// The three conference days, keyed by their Pacific calendar date. Sessions are
// bucketed by the Pacific day they start on; anything outside these three days
// (e.g. a stray post-conference entry) is dropped — matching the 2025 site.
export const CONFERENCE_DAYS = [
  { key: "2025-09-12", name: "Friday", dateLabel: "Sep 12" },
  { key: "2025-09-13", name: "Saturday", dateLabel: "Sep 13" },
  { key: "2025-09-14", name: "Sunday", dateLabel: "Sep 14" },
] as const;

const PACIFIC = "America/Los_Angeles";

function pacificParts(ts: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ts));
  const o: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") o[p.type] = p.value;
  return o;
}

/** Pacific calendar day, e.g. "2025-09-13". */
function pacificDayKey(ts: string): string {
  const p = pacificParts(ts);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutes since Pacific midnight — how blocks are positioned in the grid. */
export function pacificMinutes(ts: string): number {
  const p = pacificParts(ts);
  // "24" can surface for local midnight in some ICU builds; normalize to 0.
  const hour = Number(p.hour) % 24;
  return hour * 60 + Number(p.minute);
}

/** "2:00 PM" in Pacific time. */
export function formatPacificTime(ts: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ts));
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatPacificTime(start)} – ${formatPacificTime(end)}`;
}

export function hostNames(session: Session): string[] {
  return [session.host_1, session.host_2, session.host_3]
    .map((h) =>
      h?.first_name ? `${h.first_name} ${h.last_name ?? ""}`.trim() : "",
    )
    .filter(Boolean);
}

// Explicit left-to-right column order for the schedule. Any location not listed
// here (e.g. The Bughouse, or The Food Court — just food trucks) is omitted
// entirely, from both the grid and the list.
const SCHEDULE_LOCATION_ORDER = [
  "The Park",
  "Eigen Hall",
  "The Clocktower",
  "The Gardens",
  "Central Courtyard",
  "Escape Room Zone",
  "Playtesting Plaza",
  "Mind Mansion",
  "The Utility Room",
  "The Family Room",
];

/** Locations shown in the schedule, in the explicit order above. */
export const scheduleLocations: Location[] = SCHEDULE_LOCATION_ORDER.map(
  (name) => data.locations.find((l) => l.name === name),
).filter((l): l is Location => Boolean(l));

const shownLocationIds = new Set(scheduleLocations.map((l) => l.id));

export interface Day {
  key: string;
  name: string;
  dateLabel: string;
  sessions: Session[];
  /** 30-min slot boundaries (minutes since Pacific midnight) covering the day. */
  slots: number[];
}

const PX_PER_MIN = 2;
export const SLOT_MINUTES = 30;
export const SLOT_PX = SLOT_MINUTES * PX_PER_MIN;

export function offsetPx(session: Session, slotStart: number): number {
  return (
    Math.max(0, pacificMinutes(session.start_time) - slotStart) * PX_PER_MIN
  );
}

export function heightPx(session: Session): number {
  const dur =
    pacificMinutes(session.end_time) - pacificMinutes(session.start_time);
  return Math.max(SLOT_PX, dur * PX_PER_MIN);
}

export function startsInSlot(session: Session, slotStart: number): boolean {
  const m = pacificMinutes(session.start_time);
  return m >= slotStart && m < slotStart + SLOT_MINUTES;
}

/** Group sessions into the three conference days, each with its own time span. */
export const days: Day[] = CONFERENCE_DAYS.map((day) => {
  const sessions = data.sessions
    .filter(
      (s) =>
        pacificDayKey(s.start_time) === day.key &&
        s.location_id !== null &&
        shownLocationIds.has(s.location_id),
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const starts = sessions.map((s) => pacificMinutes(s.start_time));
  const ends = sessions.map((s) => pacificMinutes(s.end_time));
  const startMin = Math.floor(Math.min(...starts) / 60) * 60;
  const endMin = Math.ceil(Math.max(...ends) / SLOT_MINUTES) * SLOT_MINUTES;

  const slots: number[] = [];
  for (let m = startMin; m < endMin; m += SLOT_MINUTES) slots.push(m);

  return { ...day, sessions, slots };
});

export function slotLabel(slotStart: number): string {
  const h = Math.floor(slotStart / 60);
  const m = slotStart % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
