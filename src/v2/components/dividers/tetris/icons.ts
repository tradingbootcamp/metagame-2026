// Tetromino divider — I · O · T · L drawn here as four unit squares each (no
// third-party art, nothing to credit). Every piece shares the same cell size so
// the row reads as one set; the box class is spelled out per piece because
// Tailwind only picks up literal class strings. All four lie flat. Not mounted
// anywhere yet; available for a future section.
import type { GameIcon } from "../IconDivider";

const CELL = 11;
const SEAM = 1.2; // gap between cells, so each square reads as its own block

type Cell = [col: number, row: number];

function piece(name: string, className: string, cells: Cell[]): GameIcon {
  const cols = Math.max(...cells.map(([c]) => c)) + 1;
  const rows = Math.max(...cells.map(([, r]) => r)) + 1;
  const side = CELL - SEAM;
  return {
    name,
    viewBox: `0 0 ${cols * CELL} ${rows * CELL}`,
    className,
    paths: cells.map(
      ([c, r]) =>
        `M${c * CELL + SEAM / 2} ${r * CELL + SEAM / 2}h${side}v${side}h-${side}z`,
    ),
  };
}

export const ICONS: GameIcon[] = [
  piece("tetris-i", "h-[11px] w-[44px]", [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ]),
  piece("tetris-o", "h-[22px] w-[22px]", [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]),
  piece("tetris-t", "h-[22px] w-[33px]", [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ]),
  piece("tetris-l", "h-[22px] w-[33px]", [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ]),
];
