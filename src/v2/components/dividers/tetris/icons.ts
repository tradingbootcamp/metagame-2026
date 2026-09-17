// Tetromino divider — I · O · T · L drawn here as four unit squares each (no
// third-party art, nothing to credit). `render` centres a piece's cells in a
// square box so it can spin in place without the row reflowing. Not mounted
// anywhere yet.

const CELL = 11;
const SEAM = 1.2; // gap between cells, so each square reads as its own block

export type Cell = [col: number, row: number];

export const PIECES: { name: string; cells: Cell[] }[] = [
  {
    name: "tetris-i",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  },
  {
    name: "tetris-o",
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    name: "tetris-t",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
  },
  {
    name: "tetris-l",
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
];

export function render(cells: Cell[]) {
  const cols = Math.max(...cells.map(([c]) => c)) + 1;
  const rows = Math.max(...cells.map(([, r]) => r)) + 1;
  const box = Math.max(cols, rows) * CELL;
  const dx = (box - cols * CELL) / 2;
  const dy = (box - rows * CELL) / 2;
  const side = CELL - SEAM;
  return {
    viewBox: `0 0 ${box} ${box}`,
    box,
    paths: cells.map(
      ([c, r]) =>
        `M${dx + c * CELL + SEAM / 2} ${dy + r * CELL + SEAM / 2}h${side}v${side}h-${side}z`,
    ),
  };
}
