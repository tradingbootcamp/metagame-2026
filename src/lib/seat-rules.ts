import { formatPacificDay, toPacificWall } from "./schedule";
import { dayPasses, type DayPass } from "./tickets";

/**
 * The pass a stored tier names: an id, a label or a Stripe product name
 * ("friday", "Friday Day Pass", "Metagame 2026 Day Pass - Friday"). Anything
 * else admits every day, so an odd tier never turns a paying attendee away.
 */
export function dayPassOf(tier: string | null): DayPass | undefined {
  const name = tier?.trim().toLowerCase() ?? "";
  return dayPasses.find(
    (p) => name === p.id || (name.includes("day pass") && name.includes(p.id)),
  );
}

type CoverageTicket = {
  status: string;
  tier: string | null;
  ownerUserId: string | null;
};

/**
 * Why the user's claimed tickets don't admit them on a session's Pacific day,
 * or null when they do. Unclaimed tickets they hold or bought don't count.
 */
export function dayPassRefusal(
  tickets: CoverageTicket[],
  userId: string,
  startsAt: string,
): string | null {
  const passes = tickets
    .filter((t) => t.status === "paid" && t.ownerUserId === userId)
    .map((t) => dayPassOf(t.tier));
  const dayOnly = passes.filter((p) => p !== undefined);
  if (dayOnly.length === 0 || dayOnly.length < passes.length) return null;
  const day = toPacificWall(startsAt).slice(0, 10).replaceAll("-", "");
  if (dayOnly.some((p) => p.date.ymd === day)) return null;
  const covered = [...new Set(dayOnly.map((p) => p.date.long))].join(" and ");
  return `Your day pass covers ${covered}. This session is on ${formatPacificDay(startsAt)}, so you can't RSVP to it.`;
}

/**
 * Why a capacity can't be set, or null. Only a cut is refused: a session staff
 * already took below its going count must still save, or its host couldn't
 * edit anything else on it.
 */
export function capacityRefusal(
  next: number | null,
  stored: number | null,
  going: number,
): string | null {
  if (next === null || next >= going) return null;
  if (stored !== null && next >= stored) return null;
  const people = going === 1 ? "1 person is" : `${going} people are`;
  return `${people} already going, so capacity can't go below ${going}.`;
}
