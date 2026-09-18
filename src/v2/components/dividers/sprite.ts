import type { GameIcon } from "./IconDivider";

// A pixel-art glyph from rows of `#` (on) and `.` (off). Each on-pixel is one
// unit square; the viewBox is the grid, so IconGlyph scales it to the row.
// Sprites in one row should share a `grid` (cols × rows) so their pixels
// render at the same size: the art is centred inside it. Cells overlap by a
// hair so anti-aliasing doesn't draw seams between them.
export function sprite(
  name: string,
  rows: string[],
  opts: { grid?: [number, number]; className?: string } = {},
): GameIcon {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const [gw, gh] = opts.grid ?? [w, h];
  const ox = (gw - w) / 2;
  const oy = (gh - h) / 2;
  const d = rows
    .flatMap((row, y) =>
      [...row].map((c, x) =>
        c === "#" ? `M${x + ox} ${y + oy}h1.04v1.04h-1.04z` : "",
      ),
    )
    .join("");
  return {
    name,
    viewBox: `0 0 ${gw} ${gh}`,
    d,
    className: opts.className,
  };
}
