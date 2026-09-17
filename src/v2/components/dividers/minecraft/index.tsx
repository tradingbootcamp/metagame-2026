// Minecraft divider — pickaxe, grass block, creeper face, torch. Pixel grids
// except the block, which is an isometric cube with the grass fringe and a
// little dirt punched out of its sides. Nothing to credit. Not mounted
// anywhere yet.
import DividerRow from "../DividerRow";
import { IconGlyph } from "../IconDivider";
import { GLYPH, SHADOW } from "../sizing";
import { sprite } from "../sprite";

const CHARCOAL = "#4d4d4d";

const PICKAXE = sprite("mc-pickaxe", [
  ".........#####..",
  ".......##....##.",
  ".....##..##....#",
  "....#...##.....#",
  "...#...##......#",
  "......##.......#",
  ".....##.........",
  "....##..........",
  "...##...........",
  "..##............",
  ".##.............",
  "##..............",
  "#...............",
]);

const CREEPER = sprite("mc-creeper", [
  "########",
  "########",
  "#..##..#",
  "#..##..#",
  "###..###",
  "##....##",
  "##....##",
  "##.##.##",
]);

const TORCH = sprite(
  "mc-torch",
  [
    "..####..",
    ".######.",
    ".##..##.",
    ".######.",
    "..####..",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
    "...##...",
  ],
  "h-[30px] w-[20px]",
);

// Isometric cube: top rhombus, left and right faces, seams between them.
const T = "50 8",
  UR = "88 30",
  LR = "88 72",
  B = "50 94",
  LL = "12 72",
  UL = "12 30",
  C = "50 52";
const HEX = `M${T} L${UR} L${LR} L${B} L${LL} L${UL} Z`;
const SEAMS = `M${C} L${UL} M${C} L${UR} M${C} L${B}`;
// Grass fringe: a jagged row of pixels just under each top edge, plus a
// couple of dirt specks lower down. Drawn on the left face and mirrored.
const FRINGE = [
  [15, 36],
  [23, 44],
  [31, 44],
  [39, 52],
  [20, 58],
  [36, 70],
];

function GrassBlock() {
  const id = "mask-mc-block";
  const px = (x: number, y: number, mirror = false) => (
    <rect
      key={`${x}-${y}-${mirror}`}
      x={mirror ? 100 - x - 5 : x}
      y={y}
      width={5}
      height={5}
      transform={`skewY(${mirror ? -30 : 30}) translate(0 ${mirror ? 100 * Math.tan(Math.PI / 6) - (mirror ? 0 : 0) : 0})`}
      fill="#000"
    />
  );
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${GLYPH} ${SHADOW}`}>
      <mask id={id} maskUnits="userSpaceOnUse">
        <path d={HEX} fill="#fff" />
        <path d={SEAMS} stroke="#000" strokeWidth={3} fill="none" />
        <g transform="translate(0 -22)">{FRINGE.map(([x, y]) => px(x, y))}</g>
        <g transform="translate(0 -22)">
          {FRINGE.map(([x, y]) => px(x, y, true))}
        </g>
      </mask>
      <path d={HEX} fill={CHARCOAL} mask={`url(#${id})`} />
    </svg>
  );
}

export default function MinecraftDivider() {
  return (
    <DividerRow>
      <IconGlyph icon={PICKAXE} />
      <GrassBlock />
      <IconGlyph icon={CREEPER} />
      <IconGlyph icon={TORCH} />
    </DividerRow>
  );
}
