import { END_GAP_MINUTES } from "./schedule";

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
