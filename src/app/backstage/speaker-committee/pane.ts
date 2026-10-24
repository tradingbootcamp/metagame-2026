import { cookies } from "next/headers";

// Whether the schedule rides alongside the list in its own column; a
// per-browser preference, so the layout can go full-width to make room.
export const PANE_COOKIE = "committee-schedule-pane";

export const schedulePaneOn = async () =>
  (await cookies()).get(PANE_COOKIE)?.value === "1";
