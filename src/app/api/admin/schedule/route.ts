import { authorize, json } from "@/lib/schedule-api";
import { loadRsvpCounts, loadSchedule } from "@/lib/schedule-store";

export const dynamic = "force-dynamic";

/** The whole schedule: rooms, sessions with hosts, and RSVP counts. */
export async function GET() {
  const access = await authorize();
  if (access instanceof Response) return access;
  const [{ locations, sessions }, counts] = await Promise.all([
    loadSchedule(),
    loadRsvpCounts(),
  ]);
  return json({
    locations,
    sessions: sessions.map((s) => ({
      ...s,
      rsvps: counts[s.id] ?? { going: 0, waitlist: 0 },
    })),
  });
}
