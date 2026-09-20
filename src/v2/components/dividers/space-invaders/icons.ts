import { sprite } from "../sprite";

// All on one 13×8 grid so the pixels match across the row.
export const GRID: [number, number] = [13, 8];

// Two frames each, swapped on every march step.
export const SQUID = [
  sprite(
    "invader-squid",
    [
      "...##...",
      "..####..",
      ".######.",
      "##.##.##",
      "########",
      "..#..#..",
      ".#.##.#.",
      "#.#..#.#",
    ],
    { grid: GRID },
  ),
  sprite(
    "invader-squid-b",
    [
      "...##...",
      "..####..",
      ".######.",
      "##.##.##",
      "########",
      ".#.##.#.",
      "#......#",
      ".#....#.",
    ],
    { grid: GRID },
  ),
];

export const CRAB = [
  sprite(
    "invader-crab",
    [
      "..#.....#..",
      "...#...#...",
      "..#######..",
      ".##.###.##.",
      "###########",
      "#.#######.#",
      "#.#.....#.#",
      "...##.##...",
    ],
    { grid: GRID },
  ),
  sprite(
    "invader-crab-b",
    [
      "..#.....#..",
      "#..#...#..#",
      "#.#######.#",
      "###.###.###",
      "###########",
      ".#########.",
      "..#.....#..",
      ".#.......#.",
    ],
    { grid: GRID },
  ),
];

export const BUNKER_ROWS = [
  "..########..",
  ".##########.",
  "############",
  "############",
  "############",
  "############",
  "####....####",
  "###......###",
];

export const bunker = (rows: string[]) =>
  sprite("invader-bunker", rows, { grid: GRID });

export const CANNON = sprite(
  "invader-cannon",
  [
    "......#......",
    ".....###.....",
    ".....###.....",
    ".###########.",
    "#############",
    "#############",
    "#############",
    "#############",
  ],
  { grid: GRID },
);

export const BOOM = sprite(
  "invader-boom",
  [
    "....#...#....",
    ".#...#.#...#.",
    "..#.......#..",
    "...#.....#...",
    "##.........##",
    "...#.....#...",
    "..#..#.#..#..",
    ".#..#...#..#.",
  ],
  { grid: GRID },
);
