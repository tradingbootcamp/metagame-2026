// Tetromino divider — I · O · T · L drawn here as four unit squares each (no
// third-party art, nothing to credit). Pieces are cell grids so they can be
// rotated; `render` turns a grid into an svg viewBox + paths sized in px so
// the layout box follows the rotation. Not mounted anywhere yet.

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

const size = (cells: Cell[]) => ({
  cols: Math.max(...cells.map(([c]) => c)) + 1,
  rows: Math.max(...cells.map(([, r]) => r)) + 1,
});

// Quarter turn clockwise: (c, r) → (rows-1-r, c).
export function rotate(cells: Cell[]): Cell[] {
  const { rows } = size(cells);
  return cells.map(([c, r]) => [rows - 1 - r, c]);
}

export function render(cells: Cell[]) {
  const { cols, rows } = size(cells);
  const side = CELL - SEAM;
  return {
    viewBox: `0 0 ${cols * CELL} ${rows * CELL}`,
    width: cols * CELL,
    height: rows * CELL,
    paths: cells.map(
      ([c, r]) =>
        `M${c * CELL + SEAM / 2} ${r * CELL + SEAM / 2}h${side}v${side}h-${side}z`,
    ),
  };
}
