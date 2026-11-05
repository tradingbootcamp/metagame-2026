import {
  CONFERENCE_DAYS,
  fromPacificWall,
  opensAt,
  pacificDayKey,
  wallAt,
} from "@/lib/schedule";

/** A day pass stays on sale through the end of its own Pacific day. */
export function isDayPassOnSale(
  pass: { date: { ymd: string } },
  now = new Date(),
): boolean {
  return pass.date.ymd >= pacificDayKey(now.toISOString()).replaceAll("-", "");
}

export function eventHasStarted(now = new Date()): boolean {
  const day = CONFERENCE_DAYS[0].key;
  return now >= fromPacificWall(wallAt(day, opensAt(day)))!;
}
