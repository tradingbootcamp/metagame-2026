// Space Invaders divider — squid, crab, a shield bunker and the laser cannon,
// drawn as pixel grids. Nothing to credit. Not mounted anywhere yet.
import IconDivider from "../IconDivider";
import { sprite } from "../sprite";

// All on one 13×8 grid so the pixels match across the row.
const GRID: [number, number] = [13, 8];
const ICONS = [
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
    "invader-bunker",
    [
      "..########..",
      ".##########.",
      "############",
      "############",
      "############",
      "############",
      "####....####",
      "###......###",
    ],
    { grid: GRID },
  ),
  sprite(
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
  ),
];

export default function SpaceInvadersDivider() {
  return <IconDivider icons={ICONS} />;
}
