import {
  activeClasses,
  classLevelLabel,
  type MegagameLevels,
} from "@/lib/megagame-levels";
import { PACIFIC } from "@/lib/schedule";

const WHEN = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC,
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "Sat 3:42 PM", in con time. */
export const when = (at: Date) => WHEN.format(at);

/** "Level 2 Wizard, Level 1 Alien", or a note when there are none. */
export function levelsText(levels: MegagameLevels): string {
  const active = activeClasses(levels);
  if (active.length === 0) return "No class yet";
  return active.map((a) => classLevelLabel(a.class, a.level)).join(", ");
}
