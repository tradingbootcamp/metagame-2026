import type { GameIcon } from "./IconDivider";

// A pixel-art glyph from rows of `#` (on) and `.` (off). Each on-pixel is one
// unit square; the viewBox is the grid, so IconGlyph scales it to the row.
export function sprite(
  name: string,
  rows: string[],
  className?: string,
): GameIcon {
  const w = Math.max(...rows.map((r) => r.length));
  const d = rows
    .flatMap((row, y) =>
      [...row].map((c, x) => (c === "#" ? `M${x} ${y}h1v1h-1z` : "")),
    )
    .join("");
  return { name, viewBox: `0 0 ${w} ${rows.length}`, d, className };
}
