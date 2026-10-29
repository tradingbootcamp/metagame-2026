import {
  CONFERENCE_DAYS,
  isPlaced,
  pacificDayKey,
  pacificMinutes,
} from "@/lib/schedule";
import { loadSchedule } from "@/lib/schedule-store";
import { DRAFT_SCHEDULE_2026 } from "@/v2/data/schedule-2026-draft";

// The home page's clock replay runs on the team's draft 2026 schedule (Libi,
// Oct 28): every placed session in a public room, published or not. It
// carries only what the clock shows, so no hosts, emails or descriptions
// leave the server.

export type ClockSession = {
  id: string;
  title: string;
  category: string | null;
  /** "2026-11-07", in Pacific time. */
  day: string;
  /** Minutes since Pacific midnight; an end past midnight runs over 1440. */
  start: number;
  end: number;
  location: string | null;
};

// Holds and notes to the team are titled in brackets ("[Hold] …", "[DONT PUT
// ON SCHEDULE] …"), so they stay off the clock.
const internal = (title: string) => title.trimStart().startsWith("[");

// Whether the public may see a room: main marks it `visibility: "public"`,
// where this branch's older schema has `showInSchedule`.
function publicRoom(room: object): boolean {
  const { visibility, showInSchedule } = room as {
    visibility?: string;
    showInSchedule?: boolean;
  };
  return visibility !== undefined
    ? visibility === "public"
    : showInSchedule !== false;
}

/** The live draft schedule, or the Oct 28 snapshot without a database. */
export async function loadClockSessions(): Promise<ClockSession[]> {
  try {
    const { sessions, locations } = await loadSchedule();
    const rooms = new Map(
      locations.filter(publicRoom).map((l) => [l.id, l.name]),
    );
    const days = new Set<string>(CONFERENCE_DAYS.map((d) => d.key));
    const live = sessions.filter(isPlaced).flatMap((s) => {
      const day = pacificDayKey(s.startsAt);
      if (!days.has(day) || internal(s.title)) return [];
      if (s.locationId && !rooms.has(s.locationId)) return [];
      const start = pacificMinutes(s.startsAt);
      const end = pacificMinutes(s.endsAt);
      return [
        {
          id: s.id,
          title: s.title,
          category: s.category,
          day,
          start,
          end: end <= start ? end + 24 * 60 : end,
          location: s.locationId ? (rooms.get(s.locationId) ?? null) : null,
        },
      ];
    });
    return live.length ? live : DRAFT_SCHEDULE_2026;
  } catch {
    // No database here (local dev, CI builds).
    return DRAFT_SCHEDULE_2026;
  }
}
