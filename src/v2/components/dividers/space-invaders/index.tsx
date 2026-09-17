// Space Invaders divider — the three alien sprites and the laser cannon, drawn
// as pixel grids. Nothing to credit. Not mounted anywhere yet.
import IconDivider from "../IconDivider";
import { sprite } from "../sprite";

const ICONS = [
  sprite("invader-squid", [
    "...##...",
    "..####..",
    ".######.",
    "##.##.##",
    "########",
    "..#..#..",
    ".#.##.#.",
    "#.#..#.#",
  ]),
  sprite("invader-crab", [
    "..#.....#..",
    "...#...#...",
    "..#######..",
    ".##.###.##.",
    "###########",
    "#.#######.#",
    "#.#.....#.#",
    "...##.##...",
  ]),
  sprite("invader-octopus", [
    "....####....",
    ".##########.",
    "############",
    "###..##..###",
    "############",
    "...##..##...",
    "..##.##.##..",
    "##........##",
  ]),
  sprite("invader-cannon", [
    "......#......",
    ".....###.....",
    ".....###.....",
    ".###########.",
    "#############",
    "#############",
    "#############",
    "#############",
  ]),
];

export default function SpaceInvadersDivider() {
  return <IconDivider icons={ICONS} />;
}
