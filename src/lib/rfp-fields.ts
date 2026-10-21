// The RFP pipeline columns, apart from rfp-rubric.ts so client components can
// name them without pulling in the Airtable client and its env.

import { END_GAP_MINUTES } from "./schedule";

export const GRADER_FIELD = "Rubric: Grader";
export const VERDICT_FIELD = "Verdict";
export const NEXT_STEPS_FIELD = "Next steps";
export const SHEPHERD_FIELD = "Shepherd";

export const NEXT_STEPS_ASSIGN_GRADER = "0. Assign grader";
/** Where a proposal waits while it's still with its grader. */
export const NEXT_STEPS_GRADE = "1. Grade";
/** Where a grader's save moves it once the rubric is done. */
export const NEXT_STEPS_DECIDE = "2. Committee decision";
export const NEXT_STEPS_ASSIGN_SHEPHERD = "4. Assign shepherd";
export const NEXT_STEPS_SHEPHERD_MEETING = "5. Shepherd meeting";
/** Accepted and waiting for a slot; taking it off the schedule returns it here. */
export const NEXT_STEPS_SCHEDULE = "6. Add to schedule";
/** Placed on the schedule. The trailing space is in the option name itself. */
export const NEXT_STEPS_DONE = "7. None! We're good :) ";

/**
 * Minutes a proposal's free-text Duration ("1 hour", "90 min", "1.5 hrs")
 * books on the grid: whole half hours, ending on the passing period. Null when
 * there's no number in it.
 */
export function durationMinutes(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const m = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?|m|min|mins|minutes?)?\b/i.exec(
    text,
  );
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? "").toLowerCase();
  // A bare number reads as hours when small, e.g. "2", else as minutes.
  const raw = unit.startsWith("m") || (!unit && n > 8) ? n : n * 60;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const slots = Math.min(16, Math.max(1, Math.ceil(raw / 30)));
  return slots * 30 - END_GAP_MINUTES;
}
