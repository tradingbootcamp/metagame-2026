import type { GameIcon } from "./IconDivider";

// A pixel-art glyph from rows of `#` (on) and `.` (off). Each on-pixel is one
// unit square; the viewBox is the grid, so IconGlyph scales it to the row.
// Cells overlap by a hair so anti-aliasing doesn't draw seams between them.
export function sprite(
  name: string,
  rows: string[],
  className?: string,
): GameIcon {
  const w = Math.max(...rows.map((r) => r.length));
  const d = rows
    .flatMap((row, y) =>
      [...row].map((c, x) => (c === "#" ? `M${x} ${y}h1.04v1.04h-1.04z` : "")),
    )
    .join("");
  return { name, viewBox: `0 0 ${w} ${rows.length}`, d, className };
}
