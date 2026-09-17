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
  ".......#######..",
  ".....###..#####.",
  "....##...##..##.",
  "...##...##....##",
  "...#...##......#",
  "......##.......#",
  ".....##........#",
  "....##..........",
  "...##...........",
  "..##............",
  ".##.............",
  "##..............",
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
// Grass line: a stepped zigzag under each top edge (grass over dirt), plus a
// few dirt specks lower on the face. Built for the left face and mirrored.
const STEPS = 8;
function grassLine(from: [number, number], to: [number, number]): string {
  const pts: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t;
    const drop = i % 2 === 0 ? 9 : 13;
    if (i > 0) {
      const prev = i % 2 === 0 ? 13 : 9;
      pts.push(`L${x} ${y + prev}`);
    }
    pts.push(`${i === 0 ? "M" : "L"}${x} ${y + drop}`);
  }
  return pts.join(" ");
}
const LEFT_GRASS = grassLine([12, 30], [50, 52]);
const RIGHT_GRASS = grassLine([50, 52], [88, 30]);
const DIRT = [
  [22, 62],
  [36, 76],
  [60, 76],
  [76, 60],
];

function GrassBlock() {
  const id = "mask-mc-block";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${GLYPH} ${SHADOW}`}>
      <mask id={id} maskUnits="userSpaceOnUse">
        <path d={HEX} fill="#fff" />
        <path d={SEAMS} stroke="#000" strokeWidth={3} fill="none" />
        <path d={LEFT_GRASS} stroke="#000" strokeWidth={2.5} fill="none" />
        <path d={RIGHT_GRASS} stroke="#000" strokeWidth={2.5} fill="none" />
        {DIRT.map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={4}
            height={4}
            fill="#000"
          />
        ))}
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
