// Tetromino divider — I · O · T · L drawn here as four unit squares each (no
// third-party art, nothing to credit). Each piece sits where it does in its
// Super Rotation System box (3×3 for T/L, 4×4 for I, 2×2 for O), so spinning
// the box about its centre is exactly how the piece turns in the game: T/L
// pivot on the middle cell of their three-long bar, the I on a grid corner.
// Not mounted anywhere yet.

const CELL = 11;
const SEAM = 1.2; // gap between cells, so each square reads as its own block

export type Cell = [col: number, row: number];

export const PIECES: { name: string; box: number; cells: Cell[] }[] = [
  {
    name: "tetris-i",
    box: 4,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  {
    name: "tetris-o",
    box: 2,
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    name: "tetris-t",
    box: 3,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
  },
  {
    name: "tetris-l",
    box: 3,
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
];

export function render(box: number, cells: Cell[]) {
  const side = CELL - SEAM;
  return {
    viewBox: `0 0 ${box * CELL} ${box * CELL}`,
    px: box * CELL,
    paths: cells.map(
      ([c, r]) =>
        `M${c * CELL + SEAM / 2} ${r * CELL + SEAM / 2}h${side}v${side}h-${side}z`,
    ),
  };
}
