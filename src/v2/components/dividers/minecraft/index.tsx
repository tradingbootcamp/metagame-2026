// Minecraft divider — pickaxe, grass block, creeper face, torch as pixel
// grids. Nothing to credit. Not mounted anywhere yet.
import IconDivider from "../IconDivider";
import { sprite } from "../sprite";

const ICONS = [
  sprite("mc-pickaxe", [
    "...#####..",
    ".##..#..##",
    "#....#...#",
    "#...#....#",
    "...#......",
    "..#.......",
    ".#........",
    "#.........",
  ]),
  sprite("mc-block", [
    "########",
    "########",
    "#.##.##.",
    "########",
    "########",
    "##.#####",
    "########",
    "####.###",
  ]),
  sprite("mc-creeper", [
    "########",
    "########",
    "#..##..#",
    "#..##..#",
    "###..###",
    "##....##",
    "##....##",
    "##.##.##",
  ]),
  sprite(
    "mc-torch",
    [
      ".####.",
      ".####.",
      ".#..#.",
      ".####.",
      "..##..",
      "..##..",
      "..##..",
      "..##..",
      "..##..",
      "..##..",
    ],
    "h-[30px] w-[18px]",
  ),
];

export default function MinecraftDivider() {
  return <IconDivider icons={ICONS} />;
}
