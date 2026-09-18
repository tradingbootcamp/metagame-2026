// Tetromino divider — I · O · T · L drawn here as four unit squares each (no
// third-party art, nothing to credit). Each piece sits where it does in its
// Super Rotation System box (3×3 for T/L, 4×4 for I, 2×2 for O), so spinning
// the box about its centre is exactly how the piece turns in the game: T/L
// pivot on the middle cell of their three-long bar, the I on a grid corner.
// `lift` nudges a box up by that many cells so the four resting pieces share
// one grid (the row centres the boxes, and the 4×4 and 2×2 are half a cell
// off the 3×3s). Not mounted anywhere yet.

export const CELL = 11;
const SEAM = 1.2; // gap between cells, so each square reads as its own block

export type Cell = [col: number, row: number];

export const PIECES: {
  name: string;
  box: number;
  lift?: number;
  cells: Cell[];
}[] = [
  {
    name: "tetris-i",
    box: 4,
    lift: 0.5,
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
    lift: 0.5,
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

// The cells after that many quarter turns clockwise about the box centre.
export const turn = (box: number, cells: Cell[], quarters: number): Cell[] =>
  quarters % 4 === 0
    ? cells
    : turn(
        box,
        cells.map(([c, r]): Cell => [box - 1 - r, c]),
        quarters - 1,
      );

// The box row lying on the divider's centre line: the one grid row every
// piece can reach, so the one that can fill.
export const floorRow = (box: number, lift = 0) => box / 2 + lift - 0.5;

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
