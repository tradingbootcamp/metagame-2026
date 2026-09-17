"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import { Heart } from "lucide-react";
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";
import { coinSound, dialTone, ringBell } from "./bells";
import { FLAME } from "./fire";
import { hairs } from "./fuzz";
import Crab from "./Crab";
import Acid, { ACID_MS, rollTrip, type Trip } from "./Acid";
import Sudo, { SUDO_MS } from "./Sudo";
import Weather, { rollShower, showerMs, type Shower } from "./Weather";
import { wobble } from "./wobble";
import WordEntry from "./WordEntry";
import {
  BASE_LOOK,
  MAGA_MS,
  BITES_TO_FINISH,
  BOMB_MS,
  COIN_MS,
  CRAB_MS,
  CRAB_WAIT,
  DICE_CHOP_MS,
  DICE_FALL_MS,
  GLYPH_TIMING,
  EXIT_MS,
  ROLL_MS,
  LOVE_MS,
  LOVE_STAGGER,
  RAND_TICK_MS,
  RAND_TICKS,
  SPELLS,
  HEADSTONE,
  STRETCH,
  TURN_MS,
  VOID_MS,
  WARP_MS,
  WIND_MS,
  reducedMotion,
  seedExit,
  type Exit,
  type Glyph,
  type Hop,
  type Look,
  type Seed,
  type Spell,
} from "./effects";
import {
  CYCLE,
  RACK_SIZE,
  SCRABBLE_SCORES,
  isBlocked,
  randomRack,
  type Tile,
} from "./tiles";

// Scrabble tiles in the piece-set language: a solid charcoal tile with the
// letter and its score punched out so the cream shows through. Drawn here, no
// attribution needed. `letter` is A–Z or "" for the blank; the score comes
// from tiles.ts and is left off when `scored` is false (a played blank).
// `armed` dims the tile while it waits for a typed letter. `look` and
// `motion` carry the easter eggs (effects.ts).
// Tapping the same tile over and over is the whole interaction, so it has to
// survive iOS: touch-manipulation keeps the second tap from being read as
// double-tap-to-zoom, and coarse pointers get the cursor Safari wants before
// it will deliver a click to a plain <svg> (no cursor on a phone to give the
// secret away).
const CHARCOAL = "#4d4d4d";
const FONT = "var(--font-space-grotesk), system-ui, sans-serif";

// The dark-mode plate the punched-out letters show through.
const PLATE = "#161616";

// How a tile sits at rest: SKEW's slant, GROW/TINY's size, and FLAT squashing
// it down onto its bottom edge. Every animation that writes its own transform
// ends with this, so the looks survive it. `shrink` is VOID's.
const restPose = (look: Look, shrink = 1) => {
  const size = look.scale * shrink;
  const squash = look.flat ? 0.3 : 1;
  return `translateY(${((TILE_PX / 2) * size * (1 - squash)).toFixed(2)}px) skewX(${look.skew ? -14 : 0}deg) scale(${size}, ${size * squash})`;
};

// FLAT waits a beat before it drops.
const FLAT_DELAY_MS = 400;

// DICE: where each of the nine pieces ends up, top-left to bottom-right, as
// [cells across, cells down, degrees] — a heap on the ground the tile stood
// on: the bottom row shuffles, the rest topple off it to either side.
const PILE = [
  [-0.45, 1, -24],
  [0.7, 1, 38],
  [1.35, 2, 172],
  [-1.35, 1, -98],
  [0.1, 0.08, 11],
  [1.4, 1, 96],
  [-0.16, 0, -7],
  [0, 0, 4],
  [0.2, 0, 9],
];

const BITE_FLIPS = [
  [1, 1],
  [-1, -1],
  [-1, 1],
  [1, -1],
];

const tileFill = (look: Look) =>
  look.tint ?? (look.dark ? "var(--color-cream)" : CHARCOAL);

// BOLD: the face is already at its heaviest weight, so the punched-out text
// is fattened with a stroke instead.
const embolden = (look: Look, width: number) => ({
  stroke: "#000",
  strokeLinejoin: "round" as const,
  strokeWidth: look.bold ? width : 0,
  style: {
    transition: "stroke-width 300ms ease-out, opacity 900ms ease-in-out",
  },
});

type Motion = {
  transform?: string;
  transition?: string;
  opacity?: number;
  extra?: React.CSSProperties;
};

export function ScrabbleTile({
  letter,
  scored = true,
  flash,
  armed = false,
  look = BASE_LOOK,
  glyph,
  gap = 0,
  horns,
  halo = false,
  diced = false,
  rod = false,
  bites = 0,
  motion,
  onClick,
  ref,
}: {
  letter: string;
  scored?: boolean;
  flash?: string; // the colour a refused word flashes the tile
  armed?: boolean;
  look?: Look;
  gap?: number;
  horns?: keyof typeof HORNS;
  halo?: boolean;
  diced?: boolean;
  rod?: boolean;
  bites?: number;
  glyph?: { shape: Glyph; tile: number; delay: number; char?: string };
  motion?: Motion;
  onClick?: () => void;
  ref?: Ref<SVGSVGElement>;
}) {
  const tileId = useId();
  // WebKit doesn't repaint a masked shape when only the mask's contents
  // change (the new letter showed up on the next scroll), so the letter is
  // part of the id: the mask reference itself changes with it.
  const maskId = `${tileId}-${letter}${scored ? "" : "-blank"}`;
  // TALL grows the tile borders upward only; the text keeps its size and just
  // re-centres, so the letter never deforms. The extra height spills outside
  // the viewBox, hence overflow-visible.
  const up = (look.tall ? STRETCH : 0) + (look.dead ? HEADSTONE : 0);
  // BALL rounds the tile off completely (a pill, if it's also TALL) and pulls
  // the score in from the corner that's no longer there.
  // OVAL is the same but squatter, so it's an ellipse and not a second BALL.
  // DEAD outranks both.
  const oval = look.oval && !look.dead;
  const squat = oval ? 13 : 0;
  const height = 92 + up - 2 * squat;
  const rx = look.ball || look.oval || look.dead ? 46 : 12;
  const box = {
    x: 4,
    y: 4 - up + squat,
    width: 92,
    height,
    rx,
    ry: oval ? height / 2 : rx,
  };
  // DEAD is a headstone: the same dome on top, but a second slab in the mask
  // keeps the bottom corners as they were.
  const base = { x: 4, y: box.y + 46, width: 92, height: 50 + up, rx: 12 };
  const round = (look.ball || look.oval) && !look.dead;
  const grow =
    "y 900ms ease-in-out, height 900ms ease-in-out, rx 900ms ease-in-out, ry 900ms ease-in-out";
  const fill = flash ?? tileFill(look);
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={`${GLYPH} shrink-0 touch-manipulation overflow-visible pointer-coarse:cursor-pointer ${
        look.glow ? "drop-shadow-[0_0_5px_rgba(216,80,43,0.85)]" : SHADOW
      }`}
      style={{
        transform: `${motion?.transform ?? ""} ${restPose(look)}`,
        opacity: motion?.opacity,
        ...motion?.extra,
        marginLeft: gap,
        WebkitTapHighlightColor: "transparent",
        transition: `${
          motion?.transition ??
          `transform 300ms ease-out ${look.flat ? FLAT_DELAY_MS : 0}ms, opacity 300ms ease-out, filter 300ms ease-out`
        }, margin-left 500ms ease-in-out 350ms`,
      }}
      onClick={onClick}
      ref={ref}
    >
      {/* The tap target. An <svg> is only hit-tested where it actually paints,
          and the letter is a hole punched through the tile — so without this a
          tap on the letter, on a rounded corner, or in the 4-unit border falls
          straight through. Sized past the viewBox on touch (globals.css),
          hence overflow-visible above. */}
      <rect
        className="scrabble-hit"
        x="0"
        y="0"
        width="100"
        height="100"
        fill="none"
      />
      {/* The default mask region stops 10% outside the viewBox, which would
          crop a tile that's both TALL and DEAD. */}
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="-50"
        y="-50"
        width="200"
        height="200"
      >
        <rect {...box} fill="#fff" style={{ transition: grow }} />
        {look.dead && <rect {...base} fill="#fff" />}
        {/* Bites: the four corners first (the same three scallops, flipped
            into place), then a big one out of each side's remains, and the last
            finishes it off. */}
        {BITE_FLIPS.slice(0, bites).map(([fx, fy], n) => (
          <g
            key={n}
            transform={`translate(50 ${box.y + box.height / 2}) scale(${fx} ${fy}) translate(-50 ${-(box.y + box.height / 2)})`}
            className="animate-[scrabble-entry_120ms_ease-out]"
          >
            <circle cx="72" cy={box.y + 1} r="12" />
            <circle cx="87" cy={box.y + 13} r="12" />
            <circle cx="98" cy={box.y + 29} r="12" />
            <circle cx="96" cy={box.y + 2} r="16" />
          </g>
        ))}
        {bites > BITE_FLIPS.length && (
          <g className="animate-[scrabble-entry_120ms_ease-out]">
            <circle cx="12" cy={box.y + box.height * 0.45} r="27" />
            <circle cx="30" cy={box.y + box.height * 0.8} r="17" />
            <circle cx="86" cy={box.y + box.height * 0.55} r="25" />
          </g>
        )}
        {bites >= BITES_TO_FINISH && (
          <rect
            x="-50"
            y="-50"
            width="200"
            height="200"
            className="animate-[scrabble-entry_120ms_ease-out]"
          />
        )}
        {diced &&
          // Four knife strokes through the mask, one after another: two down,
          // two across, each cut a quick slash that stays open.
          [1, 2, 1, 2].map((third, i) => {
            const across = i > 1;
            const at = across
              ? box.y + (box.height * third) / 3
              : 4 + (92 * third) / 3;
            return (
              <line
                key={i}
                {...(across
                  ? { x1: 0, x2: 100, y1: at, y2: at }
                  : {
                      x1: at,
                      x2: at,
                      y1: box.y - 4,
                      y2: box.y + box.height + 4,
                    })}
                stroke="#000"
                strokeWidth="4.5"
                pathLength="1"
                strokeDasharray="1"
                style={{
                  animation: `scrabble-chop 130ms ${i * 190}ms ease-in both`,
                }}
              />
            );
          })}
        {glyph?.char && (
          // TIME: a digit, centred, since the score steps aside for it.
          <text
            x="50"
            y={54 - up / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={FONT}
            fontWeight="700"
            fontSize="58"
            fill="#000"
            opacity="0"
            style={{
              animation: `scrabble-glyph-in ${GLYPH_TIMING[glyph.shape].ms}ms ${glyph.delay}ms ease-in-out`,
            }}
          >
            {glyph.char}
          </text>
        )}
        {glyph && !glyph.char && (
          <path
            d={glyphPath(glyph.shape, glyph.tile)}
            transform={`translate(46 ${52 - up / 2}) scale(2.3) translate(-12 -12)`}
            fill="#000"
            opacity="0"
            style={{
              animation: `scrabble-glyph-in ${GLYPH_TIMING[glyph.shape].ms}ms ${glyph.delay}ms ease-in-out`,
            }}
          />
        )}
        {letter && (
          <>
            <g
              style={
                glyph && {
                  animation: `scrabble-glyph-out ${GLYPH_TIMING[glyph.shape].ms}ms ${glyph.delay}ms ease-in-out`,
                }
              }
            >
              <text
                x="46"
                y={54 - up / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={FONT}
                fontWeight="700"
                fontSize="58"
                fill="#000"
                {...embolden(look, 5)}
              >
                {letter}
              </text>
            </g>
            {scored && (
              <text
                opacity={glyph?.char ? 0 : 1}
                x={oval ? 74 : round ? 77 : 86}
                y={oval ? 74 : round ? 80 : 86}
                textAnchor="end"
                fontFamily={FONT}
                fontWeight="700"
                fontSize="24"
                fill="#000"
                {...embolden(look, 2)}
              >
                {SCRABBLE_SCORES[letter]}
              </text>
            )}
          </>
        )}
      </mask>
      {diced ? (
        // The same tile nine times over, each clipped to one cell of the cuts,
        // so that once they're made the pieces can drop separately.
        Array.from({ length: 9 }, (_, n) => {
          const [col, row] = [n % 3, Math.floor(n / 3)];
          const cell = {
            x: 4 + (92 * col) / 3,
            y: box.y + (box.height * row) / 3,
            width: 92 / 3,
            height: box.height / 3,
          };
          return (
            <g
              key={n}
              className="scrabble-crumb"
              style={
                {
                  "--dx": `${PILE[n][0] * cell.width}px`,
                  "--dy": `${PILE[n][1] * cell.height}px`,
                  "--rot": `${PILE[n][2]}deg`,
                  // Bottom row settles first, then what was resting on it.
                  animation: `scrabble-crumble ${DICE_FALL_MS}ms ${DICE_CHOP_MS + (2 - row) * 110}ms cubic-bezier(.55,0,.85,.4) both`,
                } as React.CSSProperties
              }
            >
              <clipPath id={`${maskId}-${n}`}>
                <rect {...cell} />
              </clipPath>
              <g clipPath={`url(#${maskId}-${n})`}>
                <rect
                  {...box}
                  rx={undefined}
                  ry={undefined}
                  fill={fill}
                  mask={`url(#${maskId})`}
                />
              </g>
            </g>
          );
        })
      ) : (
        <rect
          {...box}
          rx={undefined}
          ry={undefined}
          fill={fill}
          opacity={armed ? 0.6 : 1}
          style={{ transition: `${grow}, fill 300ms ease-out, opacity 300ms` }}
          mask={`url(#${maskId})`}
        />
      )}
      {rod && (
        // A rod out of the top-right corner, the line hanging off its tip and
        // swinging a little, a float bobbing on the end of it.
        <g
          stroke={fill}
          strokeLinecap="round"
          fill="none"
          className="animate-[scrabble-entry_600ms_ease-out]"
          style={{ transition: "stroke 300ms ease-out" }}
        >
          <path d={`M88 ${box.y + 22}L150 ${box.y - 40}`} strokeWidth="4.5" />
          <g className="scrabble-line">
            <path
              d={`M150 ${box.y - 40}v${box.height + 34}`}
              strokeWidth="1.6"
            />
            <circle
              className="scrabble-float"
              cx="150"
              cy={box.y + box.height - 4}
              r="5.5"
              fill={fill}
              stroke="none"
            />
          </g>
        </g>
      )}
      {halo && (
        <ellipse
          cx="50"
          cy={box.y - 14}
          rx="30"
          ry="8"
          fill="none"
          stroke={fill}
          strokeWidth="5"
          className="animate-[scrabble-entry_700ms_ease-out]"
          style={{ transition: "stroke 300ms ease-out, cy 900ms ease-in-out" }}
        />
      )}
      {horns && (
        // Set in a little on a rounded top, where the corners have gone.
        <g
          transform={`translate(0 ${box.y + (rx > 12 ? 7 : 0)})`}
          fill={fill}
          className="animate-[scrabble-entry_500ms_ease-out]"
          style={{ transition: "fill 300ms ease-out" }}
        >
          <path
            d={HORNS[horns]}
            transform={`translate(${rx > 12 ? 9 : 0} 0)`}
          />
          <path
            d={HORNS[horns]}
            transform={`translate(${rx > 12 ? 91 : 100} 0) scale(-1 1)`}
          />
        </g>
      )}
      {horns === "devil" && (
        <g
          className="animate-[scrabble-entry_500ms_ease-out]"
          style={{ transition: "fill 300ms ease-out, stroke 300ms ease-out" }}
        >
          <path
            d={TAIL}
            fill="none"
            stroke={fill}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d={TAIL_TIP} fill={fill} />
        </g>
      )}
      {look.fire && (
        // Inside the tile's own svg, so the flames go wherever it goes. Pulled
        // in and down a little on a rounded top, to stay on the dome.
        <g
          transform={
            rx > 12
              ? `translate(50 ${box.y + 12}) scale(.72) translate(-50 0)`
              : `translate(0 ${box.y + 2})`
          }
          className="animate-[scrabble-entry_500ms_ease-out]"
        >
          <path
            d={FLAME}
            fill={fill}
            className="scrabble-flame"
            style={{ transition: "fill 300ms ease-out" }}
          />
        </g>
      )}
      {look.fuzz && (
        <path
          d={hairs(box, box.rx, look.dead ? 12 : box.rx, oval)}
          stroke={fill}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity={armed ? 0.6 : 1}
          className="animate-[scrabble-entry_600ms_ease-out]"
          style={{ transition: "stroke 300ms ease-out, opacity 300ms" }}
        />
      )}
    </svg>
  );
}

// The left horn, rooted in the tile's top-left corner and mirrored for the
// right. EVIL's stand up to a point; BULL's go out sideways first, like a cow's.
const HORNS = {
  devil: "M8 12C-10 8-16-12-5-28-6-13 2-3 26 5Z",
  bull: "M6 24C-14 24-28 10-25-14-17 2-5 7 14 5Z",
};
// EVIL's tail: out of the bottom-left, an S-bend, and a spade on the end.
const TAIL = "M8 84C-12 90-30 76-20 60-14 50-24 44-30 38";
const TAIL_TIP = "M-40 42L-33 22-20 38Z";

// STAR / MOON, as filled shapes on a 24-unit grid. The moon runs through its
// phases down the rack: a waxing crescent, full, waning gibbous, and a last
// thin crescent.
const STAR =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

// The lit part of a moon: a half disc on the lit side, closed by the
// terminator — half an ellipse that bulges away from it past half-lit.
const phase = (lit: number, waxing: boolean) => {
  const R = 9;
  const side = waxing ? 1 : 0;
  const bulge = lit > 0.5 ? side : 1 - side;
  return `M12 3A${R} ${R} 0 0 ${side} 12 21A${(R * Math.abs(1 - 2 * lit)).toFixed(2)} ${R} 0 0 ${bulge} 12 3Z`;
};
const MOONS = [
  phase(0.3, true),
  phase(1, true),
  phase(0.7, false),
  phase(0.12, false),
];

// TIME: the local time as the rack's four digits, 12-hour.
const clock = () => {
  const now = new Date();
  return (
    String(now.getHours() % 12 || 12).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0")
  );
};

const glyphPath = (shape: Glyph, tile: number) =>
  shape === "star" ? STAR : MOONS[tile % MOONS.length];

const FLASH_MS = 350;

// The rack's layout in px — GLYPH's side, and the plate's gap-[22px] and px-4
// — for ROLL's geometry and for placing LOVE's hearts.
const TILE_PX = 30;
const TILE_GAP = 22;
const PLATE_PAD = 16;
// PART: extra room opened up in the middle of the rack.
const PART_PX = 14;
const partGap = (look: Look, i: number) =>
  look.part && i === RACK_SIZE / 2 ? PART_PX : 0;
// A tile's centre, from the plate's left edge.
const tileX = (look: Look, i: number) =>
  PLATE_PAD +
  TILE_PX / 2 +
  i * (TILE_PX + TILE_GAP) +
  (look.part && i >= RACK_SIZE / 2 ? PART_PX : 0);

// The rack lives outside React so the first client read can roll a random
// word while the server renders blanks — no hydration mismatch, no setState
// in an effect. Shared across every mounted rack, which is fine: there's one.
const BLANK: Tile[] = Array.from({ length: RACK_SIZE }, () => ({
  letter: "",
}));
let rack: Tile[] | null = null;
const listeners = new Set<() => void>();
const getSnapshot = () => (rack ??= randomRack());
const getServerSnapshot = () => BLANK;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const setRack = (next: Tile[]) => {
  rack = next;
  listeners.forEach((l) => l());
};

// A rack of RACK_SIZE tiles. Each click advances that tile one step through
// CYCLE. A click that lands on the blank arms it: the next letter typed is
// played on it (unscored, as in the game); Escape or another click disarms.
// Spelling a blacklisted word flashes the tiles orange and re-rolls; spelling
// one of the easter-egg words in effects.ts casts it. Nothing an egg does is
// undone short of a reload — FALL, RISE and ZOOM end the rack for good.
export const rerollRack = () => setRack(randomRack());

// The /dividers gallery types words straight onto the rack through this.
export type ScrabbleHandle = { spell: (letters: string) => void };

export default function ScrabbleDivider({
  ref,
}: {
  ref?: Ref<ScrabbleHandle>;
}) {
  const tiles = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [flash, setFlash] = useState<string | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [look, setLook] = useState<Look>(BASE_LOOK);
  // Cumulative, so consecutive spins keep turning the same way.
  const [turn, setTurn] = useState(0);
  const [turning, setTurning] = useState(false);
  // A tile's standing rotation: the spins so far, plus TILT.
  const standing = turn + look.tilt;
  // TYPE: the keyboard entry beside the rack, and what's in it.
  const [typed, setTyped] = useState<string | null>(null);
  // One coin, out of a random tile. `id` remounts it so COIN can be recast.
  const [coin, setCoin] = useState<{ id: number; tile: number } | null>(null);
  const [glyph, setGlyph] = useState<{
    id: number;
    shape: Glyph;
    chars?: string;
  } | null>(null);
  const [shower, setShower] = useState<(Shower & { id: number }) | null>(null);
  // Bumped per cast; the effect below does the flickering.
  const [rand, setRand] = useState(0);
  const [acid, setAcid] = useState<{ id: number; trip: Trip } | null>(null);
  const [sudo, setSudo] = useState(0);
  const [stopped, setStopped] = useState(false);
  // TONE runs for minutes: STOP ends it, so does leaving the page, and once an
  // exit has taken the rack away it trails off after it.
  const hangUp = useRef<((fade?: number) => void) | null>(null);
  useEffect(() => () => hangUp.current?.(), []);
  const before = useRef<Tile[] | null>(null);
  const typing = useRef<{
    under: Tile[];
    length: number;
    reached: number;
  } | null>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLSpanElement>(null);
  const tileRefs = useRef<(SVGSVGElement | null)[]>([]);
  const [hop, setHop] = useState<Hop | null>(null);
  // One heart per tile; `id` remounts them so LOVE can be cast again mid-air.
  const [love, setLove] = useState<{
    id: number;
    hearts: { x: number; tilt: number }[];
  } | null>(null);
  const [exit, setExit] = useState<{ to: Exit; seeds: Seed[] } | null>(null);
  // Set once the last tile is clear of the page: the tiles are swapped for
  // empty spacers, so the hairlines keep their gap.
  const [gone, setGone] = useState(false);
  const [maga, setMaga] = useState(0);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const cast = (spell: Spell) => {
    switch (spell.kind) {
      case "bell":
        ringBell(spell.which);
        break;
      case "maga":
        setMaga((n) => n + 1);
        break;
      case "turn":
        if (reducedMotion()) break;
        setTurning(true);
        setTurn((d) => d + 360 * spell.turns);
        break;
      case "hop":
        if (reducedMotion()) break;
        setHop(spell.hop);
        break;
      case "stop":
        hangUp.current?.();
        hangUp.current = null;
        setArmed(null);
        setStopped(true);
        break;
      case "acid": {
        if (reducedMotion()) break;
        setAcid((a) => ({ id: (a?.id ?? 0) + 1, trip: rollTrip() }));
        // The page swims too, where that's affordable: not on touch devices.
        const page = document.querySelector("main");
        if (page && !window.matchMedia("(pointer: coarse)").matches)
          wobble(page, { ms: ACID_MS, peak: 30, grain: 0.004, inView: true });
        break;
      }
      case "warp":
        if (!reducedMotion() && plateRef.current)
          wobble(plateRef.current, { ms: WARP_MS, peak: 42, grain: 0.022 });
        break;
      case "tone":
        hangUp.current?.();
        hangUp.current = dialTone();
        break;
      case "sudo":
        setSudo((n) => n + 1);
        break;
      case "undo":
        // A beat, so UNDO is seen to have been spelled before it isn't.
        setTimeout(() => {
          if (before.current) setRack(before.current);
        }, 500);
        break;
      case "rand":
        setRand((n) => n + 1);
        break;
      case "type":
        setTyped((w) => w ?? "");
        break;
      case "glyph":
        setGlyph((g) => ({
          id: (g?.id ?? 0) + 1,
          shape: spell.shape,
          chars: spell.shape === "time" ? clock() : undefined,
        }));
        break;
      case "weather":
        if (reducedMotion()) break;
        setShower((w) => ({
          ...rollShower(spell.weather),
          id: (w?.id ?? 0) + 1,
        }));
        break;
      case "coin":
        coinSound();
        if (!reducedMotion())
          setCoin((c) => ({
            id: (c?.id ?? 0) + 1,
            tile: Math.floor(Math.random() * RACK_SIZE),
          }));
        break;
      case "love":
        if (reducedMotion()) break;
        setLove((l) => ({
          id: (l?.id ?? 0) + 1,
          hearts: tiles.map(() => ({
            x: (Math.random() - 0.5) * 36,
            tilt: (Math.random() - 0.5) * 50,
          })),
        }));
        break;
      case "exit":
        setArmed(null);
        setExit({ to: spell.to, seeds: seedExit(RACK_SIZE, spell.to) });
        break;
      case "look":
        setLook(spell.apply);
        break;
    }
  };

  // Let the spin finish before handing the tiles back to the resting
  // transition, or a later style change would inherit the spin's easing.
  useEffect(() => {
    if (!turning) return;
    const t = setTimeout(() => setTurning(false), TURN_MS);
    return () => clearTimeout(t);
  }, [turning]);

  // Cleared when done so the same word can be cast again.
  useEffect(() => {
    if (!hop) return;
    const t = setTimeout(
      () => setHop(null),
      hop.ms * hop.count + hop.stagger * (RACK_SIZE - 1),
    );
    return () => clearTimeout(t);
  }, [hop]);

  useEffect(() => {
    if (!love) return;
    const t = setTimeout(
      () => setLove(null),
      LOVE_MS + LOVE_STAGGER * (RACK_SIZE - 1),
    );
    return () => clearTimeout(t);
  }, [love]);

  // ROLL tips each tile over its leading bottom corner, a quarter turn at a
  // time, so it travels exactly as far as it turns and bobs like a real square.
  // The pivot moves every quarter turn, which a CSS transition can't express.
  useEffect(() => {
    if (exit?.to !== "roll" || reducedMotion()) return;
    const side = TILE_PX * look.scale;
    const h = side / 2;
    const quarters = Math.ceil(window.innerWidth / side);
    const pose = (q: number, tip: number) =>
      `translateX(${q * side}px) translate(${h}px, ${h}px) rotate(${tip}deg) translate(${-h}px, ${-h}px) rotate(${turn + q * 90}deg) ${restPose(look)}`;
    // A BALL just rolls: no corners to tip over, one turn per circumference.
    const run = quarters * side;
    const frames =
      (look.ball || look.oval) && !look.dead
        ? [0, 1].map((p) => ({
            transform: `translateX(${p * run}px) rotate(${turn + (p * run * 360) / (Math.PI * side)}deg) ${restPose(look)}`,
          }))
        : Array.from({ length: quarters }, (_, q) => [
            { offset: q / quarters, transform: pose(q, 0) },
            { offset: (q + 1) / quarters, transform: pose(q, 90) },
          ]).flat();
    const anims = tileRefs.current.map((el, i) =>
      el?.animate(frames, {
        duration: ROLL_MS,
        delay: exit.seeds[i].delay,
        easing: "cubic-bezier(.45,0,.9,.7)",
        fill: "forwards",
      }),
    );
    return () => anims.forEach((a) => a?.cancel());
    // Looks can't change once an exit has begun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exit]);

  // BOMB throws each tile out from the middle of the rack on a ballistic arc:
  // sampled, since gravity isn't a cubic-bezier.
  useEffect(() => {
    if (exit?.to !== "bomb" || reducedMotion()) return;
    const GRAVITY = 2400; // px/s²
    const STEPS = 12;
    const resting = restPose(look);
    const anims = tileRefs.current.map((el, i) => {
      // Outer tiles go wide, inner ones mostly up.
      const angle =
        ((-90 + (i - (RACK_SIZE - 1) / 2) * 38 + (Math.random() - 0.5) * 30) *
          Math.PI) /
        180;
      const speed = 750 + Math.random() * 500;
      const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
      const frames = Array.from({ length: STEPS + 1 }, (_, k) => {
        const p = k / STEPS;
        const t = (p * BOMB_MS) / 1000;
        const x = Math.cos(angle) * speed * t;
        const y = Math.sin(angle) * speed * t + (GRAVITY * t * t) / 2;
        return {
          transform: `translate(${x}px, ${y}px) rotate(${standing + spin * p}deg) ${resting}`,
          opacity: p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4,
        };
      });
      return el?.animate(frames, { duration: BOMB_MS, fill: "forwards" });
    });
    return () => anims.forEach((a) => a?.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exit]);

  // VOID: the tiles come unmoored and bob in place, then drift to the middle
  // of the rack, shrinking to nothing. The hole there grows at a steady rate
  // the whole time. No
  // spin — they're falling in, not circling a drain. The hole stays.
  useEffect(() => {
    if (exit?.to !== "void" || reducedMotion()) return;
    const STEPS = 120;
    const LOOSE = 0.23; // share of the run spent just floating
    const HOLE_AFTER = 0.25; // and how far in the hole first shows
    // A long, almost imperceptible start: for a while it isn't clear anything
    // is pulling at all.
    const pull = (p: number) => Math.max(0, (p - LOOSE) / (1 - LOOSE)) ** 3.2;
    const steps = Array.from({ length: STEPS + 1 }, (_, k) => k / STEPS);
    const anims = tileRefs.current.map((el, i) => {
      const x0 =
        tileX(look, i) - (tileX(look, 0) + tileX(look, RACK_SIZE - 1)) / 2;
      const [fx, fy, ft] = [0, 1, 2].map(() => 3.3 + Math.random() * 2.6);
      const [ax, ay] = [0, 1].map(() => 3 + Math.random() * 4);
      const tilt = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5);
      const frames = steps.map((p) => {
        const e = pull(p);
        // Eases in from rest, and dies away as the tile does.
        const loose = Math.min(1, p / LOOSE) ** 2 * (1 - e);
        const x = -x0 * e + loose * ax * Math.sin(fx * 2 * Math.PI * p);
        const y = loose * ay * Math.sin(fy * 2 * Math.PI * p);
        const r = loose * tilt * Math.sin(ft * 2 * Math.PI * p);
        // They go dark as the hole opens, black by the time they reach it.
        const lit = 1 - Math.max(0, (p - HOLE_AFTER) / (1 - HOLE_AFTER));
        return {
          filter: `brightness(${lit.toFixed(3)})`,
          transform: `translate(${x}px, ${y}px) rotate(${standing + r}deg) ${restPose(look, 1 - e)}`,
        };
      });
      return el?.animate(frames, { duration: VOID_MS, fill: "forwards" });
    });
    const hole = holeRef.current?.animate(
      // Nothing at first — just tiles wobbling for no reason — then steady
      // growth to the end.
      [{ transform: "scale(0)" }, { transform: "scale(1)" }],
      {
        duration: VOID_MS * (1 - HOLE_AFTER),
        delay: VOID_MS * HOLE_AFTER,
        fill: "forwards",
      },
    );
    return () => [...anims, hole].forEach((a) => a?.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exit]);

  useEffect(() => {
    if (!glyph) return;
    const t = setTimeout(
      () => setGlyph(null),
      GLYPH_TIMING[glyph.shape].ms +
        GLYPH_TIMING[glyph.shape].stagger * (RACK_SIZE - 1),
    );
    return () => clearTimeout(t);
  }, [glyph]);

  useEffect(() => {
    if (!shower) return;
    const t = setTimeout(() => setShower(null), showerMs(shower.kind));
    return () => clearTimeout(t);
  }, [shower]);

  // Straight to the store, not through play(): a rack that happens to spell
  // something mid-flicker shouldn't cast it.
  useEffect(() => {
    if (!rand) return;
    let ticks = reducedMotion() ? 1 : RAND_TICKS;
    const t = setInterval(() => {
      setRack(randomRack());
      if (--ticks <= 0) clearInterval(t);
    }, RAND_TICK_MS);
    return () => clearInterval(t);
  }, [rand]);

  // WIND: each tile leans into it, lets go, and is carried off to the right
  // like a leaf — tumbling, lifting and dipping on its own gusts.
  useEffect(() => {
    if (exit?.to !== "wind" || reducedMotion()) return;
    const STEPS = 30;
    const HOLD = 0.18; // share of the run spent straining before letting go
    const run = window.innerWidth;
    const anims = tileRefs.current.map((el, i) => {
      const lift = 60 + Math.random() * 140;
      const gusts = 1 + Math.random() * 1.5;
      const bob = 25 + Math.random() * 45;
      const phase = Math.random() * 2 * Math.PI;
      const spin = (Math.random() < 0.3 ? -1 : 1) * (360 + Math.random() * 720);
      const frames = Array.from({ length: STEPS + 1 }, (_, k) => {
        const p = k / STEPS;
        const strain = Math.min(1, p / HOLD);
        const e = Math.max(0, (p - HOLD) / (1 - HOLD)) ** 1.8;
        const x = strain * 4 + e * run;
        const y =
          -lift * e + bob * e * Math.sin(phase + gusts * 2 * Math.PI * e);
        return {
          transform: `translate(${x}px, ${y}px) rotate(${standing + strain * 8 + spin * e}deg) ${restPose(look)}`,
        };
      });
      return el?.animate(frames, {
        duration: WIND_MS,
        delay: exit.seeds[i].delay,
        fill: "forwards",
      });
    });
    return () => anims.forEach((a) => a?.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exit]);

  useEffect(() => {
    if (!acid) return;
    const t = setTimeout(() => setAcid(null), ACID_MS);
    return () => clearTimeout(t);
  }, [acid]);

  useEffect(() => {
    if (!sudo) return;
    const t = setTimeout(() => setSudo(0), SUDO_MS);
    return () => clearTimeout(t);
  }, [sudo]);

  // Gone is gone. Once the slowest tile has left, drop the tiles.
  useEffect(() => {
    if (!exit) return;
    const longest = Math.max(...exit.seeds.map((s) => s.delay));
    const t = setTimeout(() => {
      // DICE leaves its heap where it fell.
      if (exit.to !== "dice") setGone(true);
      hangUp.current?.(0.5);
      hangUp.current = null;
    }, EXIT_MS[exit.to] + longest);
    return () => clearTimeout(t);
  }, [exit]);

  const play = (next: Tile[]) => {
    if (isBlocked(next)) {
      // One of them gets its own colour.
      setFlash(
        next.map((t) => t.letter).join("") === "CLIT"
          ? "#e8709f"
          : "var(--color-meeple)",
      );
      setRack(randomRack());
      return;
    }
    // What UNDO goes back to: the rack as it stood before this letter.
    before.current = tiles;
    setRack(next);
    const spell = SPELLS[next.map((t) => t.letter).join("")];
    if (spell) cast(spell);
  };

  // Typed letters overwrite the rack from the left, one at a time; the tiles
  // not reached yet keep what they had when the word was started. Backspace
  // leaves a blank behind.
  const spell = (letters: string) => {
    if (exit || stopped) return;
    setArmed(null);
    const fresh =
      !typing.current ||
      (letters.length === 1 && typing.current.length !== 2) ||
      letters.length > typing.current.length + 1;
    if (fresh) typing.current = { under: tiles, length: 0, reached: 0 };
    const { under, length, reached } = typing.current!;
    typing.current!.length = letters.length;
    typing.current!.reached = Math.max(reached, letters.length);
    const next = under.map((t, i) =>
      i < letters.length ? { letter: letters[i] } : i < reached ? BLANK[i] : t,
    );
    // Backspacing only clears; it doesn't spell what's left again.
    if (letters.length < length) setRack(next);
    else play(next);
  };

  useImperativeHandle(ref, () => ({ spell }));

  const advance = (i: number) => {
    if (exit || stopped) return;
    const next = [...tiles];
    // A played blank is still a blank: clicking it steps on to A like one.
    const from = tiles[i].blank ? "" : tiles[i].letter;
    const letter = CYCLE[(CYCLE.indexOf(from) + 1) % CYCLE.length];
    next[i] = { letter };
    setArmed(letter === "" ? i : null);
    play(next);
  };

  useEffect(() => {
    if (armed === null) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape") return setArmed(null);
      if (e.metaKey || e.ctrlKey || e.altKey || !/^[a-z]$/i.test(e.key)) return;
      const next = [...tiles];
      next[armed] = { letter: e.key.toUpperCase(), blank: true };
      setArmed(null);
      play(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armed, tiles]);

  const motionFor = (i: number): Motion => {
    if (exit) {
      if (reducedMotion()) return { opacity: 0, transition: "opacity 400ms" };
      const s = exit.seeds[i];
      const ms = EXIT_MS[exit.to];
      // Leans back as it floors it: the lean lands at once, the travel (on
      // `translate`, so it can ease separately) is all acceleration.
      if (exit.to === "right")
        return {
          transform: `rotate(${standing}deg) skewX(9deg)`,
          transition: `transform 220ms ease-out ${s.delay}ms, translate ${ms}ms cubic-bezier(.6,0,.95,.5) ${s.delay}ms`,
          opacity: 1,
          extra: { translate: "110vw 0" },
        };
      if (exit.to === "fade")
        return {
          transform: `rotate(${standing}deg)`,
          transition: `opacity ${ms}ms ease-in-out ${s.delay}ms`,
          opacity: 0,
        };
      // These are Web Animations (below); this just holds still.
      if (
        exit.to === "roll" ||
        exit.to === "bomb" ||
        exit.to === "void" ||
        exit.to === "wind" ||
        exit.to === "dice" ||
        exit.to === "crab"
      )
        return { transform: `rotate(${standing}deg)`, opacity: 1 };
      if (exit.to === "down")
        return {
          transform: `translate(${s.drift}px, 120vh) rotate(${standing + s.spin}deg)`,
          transition: `transform ${ms}ms cubic-bezier(.8,0,1,.55) ${s.delay}ms`,
          opacity: 1,
        };
      // A balloon: eases off the rack, climbs at a steady pace, and only
      // fades near the top.
      return {
        transform: `translate(${s.drift}px, -110vh) rotate(${standing + s.spin}deg)`,
        transition: `transform ${ms}ms cubic-bezier(.7,0,.85,.75) ${s.delay}ms, opacity ${ms * 0.35}ms ease-in ${s.delay + ms * 0.65}ms`,
        opacity: 0,
        extra: {
          "--sway-a": `${s.sway[0]}px`,
          "--sway-b": `${s.sway[1]}px`,
          "--tilt": `${Math.sign(s.sway[0]) * s.tilt}deg`,
          animation: `scrabble-sway-a ${s.period[0]}ms ${s.delay}ms infinite, scrabble-sway-b ${s.period[1]}ms ${s.delay}ms infinite`,
          animationComposition: "add",
        } as React.CSSProperties,
      };
    }
    if (turning)
      return {
        transform: `rotate(${standing}deg)`,
        transition: `transform ${TURN_MS}ms cubic-bezier(.34,1.1,.64,1)`,
      };
    // Always present, even at 0: a transform list that gains a rotate() is
    // interpolated as a matrix, where whole turns are no movement at all.
    return {
      transform: `rotate(${standing}deg)`,
      extra: hop
        ? {
            animation:
              `scrabble-${hop.name} ${hop.ms}ms ${i * hop.stagger}ms ${hop.count}` +
              (hop.name === "flip"
                ? `, scrabble-flip-turn ${hop.ms}ms ${i * hop.stagger}ms linear`
                : ""),
          }
        : undefined,
    };
  };

  return (
    <>
      <div className="relative">
        {typed !== null && !exit && (
          // Past the right-hand hairline where there's room, under the rack
          // where there isn't.
          <div className="absolute top-full left-1/2 -mt-4 -translate-x-1/2 animate-[scrabble-entry_400ms_ease-out] lg:top-1/2 lg:left-[calc(50%+300px)] lg:mt-0 lg:translate-x-0 lg:-translate-y-1/2">
            <WordEntry
              word={typed}
              disabled={stopped}
              onChange={(w) => {
                setTyped(w);
                spell(w);
              }}
            />
          </div>
        )}
        <DividerRow>
          {/* The dark-mode plate: the letters are punched out of the tiles, so
            in dark mode this is what shows through them. Negative margins keep
            the padding from shifting the hairlines. */}
          <div
            ref={plateRef}
            className="relative isolate -mx-4 -my-2.5 flex items-center gap-[22px] px-4 py-2.5"
            style={
              exit?.to === "crab" && !reducedMotion()
                ? {
                    animation: `scrabble-scuttle ${CRAB_MS}ms both, scrabble-scurry 130ms ${CRAB_MS * CRAB_WAIT}ms ease-in-out infinite alternate`,
                  }
                : undefined
            }
          >
            {exit?.to === "crab" && !gone && !reducedMotion() && (
              <Crab
                width={
                  RACK_SIZE * TILE_PX +
                  (RACK_SIZE - 1) * TILE_GAP +
                  (look.part ? PART_PX : 0)
                }
                height={TILE_PX}
                pad={[PLATE_PAD, 10]}
                gaps={Array.from({ length: RACK_SIZE - 1 }, (_, i) => [
                  tileX(look, i) + TILE_PX / 2 - 1,
                  tileX(look, i + 1) - tileX(look, i) - TILE_PX + 2,
                ])}
                color={tileFill(look)}
                wait={CRAB_MS * CRAB_WAIT}
              />
            )}
            {/* Blurred so it reads as a shadow pooling under the rack, not a box. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 -z-10 rounded-2xl blur-[8px] transition-opacity duration-500"
              style={{ background: PLATE, opacity: look.dark ? 1 : 0 }}
            />
            {/* Before the tiles, so each heart rises out from behind its own. */}
            {love?.hearts.map((h, i) => (
              <Heart
                key={`${love.id}-${i}`}
                aria-hidden
                fill="currentColor"
                className={`pointer-events-none absolute top-1/2 -mt-2 -ml-2 size-4 opacity-0 ${look.glow ? "drop-shadow-[0_0_4px_rgba(216,80,43,0.85)]" : ""}`}
                style={
                  {
                    color: tileFill(look),
                    // The hearts take after their tiles. The keyframes animate
                    // the standalone scale/translate/rotate, so this holds.
                    transform: `skewX(${look.skew ? -14 : 0}deg) scale(${look.scale}, ${look.scale * (look.tall ? 1.35 : 1)})`,
                    left: tileX(look, i),
                    "--love-x": `${h.x}px`,
                    "--love-tilt": `${h.tilt}deg`,
                    animation: `scrabble-love ${LOVE_MS}ms ${i * LOVE_STAGGER}ms ease-out`,
                  } as React.CSSProperties
                }
              />
            ))}
            {coin && !exit && (
              <span
                key={coin.id}
                aria-hidden
                className="pointer-events-none absolute top-1/2 -mt-[7px] -ml-[5px] h-[14px] w-[10px] opacity-0 [perspective:80px]"
                style={{
                  left: tileX(look, coin.tile),
                  animation: `scrabble-coin ${COIN_MS}ms`,
                }}
              >
                {/* The tile's own colour, with a cream line inside the rim. */}
                <span
                  className="block size-full rounded-[50%]"
                  style={{
                    background: tileFill(look),
                    boxShadow: `inset 0 0 0 2px ${tileFill(look)}, inset 0 0 0 3px var(--color-cream)`,
                    animation: "scrabble-coin-spin 260ms linear 3",
                  }}
                />
              </span>
            )}
            {glyph?.chars && (
              <span
                key={`colon-${glyph.id}`}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[7px] opacity-0"
                style={{
                  animation: `scrabble-glyph-in ${GLYPH_TIMING.time.ms}ms ease-in-out`,
                }}
              >
                {[0, 1].map((dot) => (
                  <span
                    key={dot}
                    className="size-[5px] rounded-full"
                    style={{ background: tileFill(look) }}
                  />
                ))}
              </span>
            )}
            {/* Outlives the rack: `gone` doesn't clear it. */}
            {exit?.to === "void" && (
              <span
                ref={holeRef}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-1/2 z-10 -mt-12 -ml-12 size-24 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, #000 0 22%, rgba(0,0,0,.8) 32%, rgba(0,0,0,.25) 50%, transparent 68%)",
                  ...(reducedMotion()
                    ? { animation: "scrabble-entry 400ms ease-out" }
                    : { transform: "scale(0)" }),
                }}
              />
            )}
            {tiles.map((t, i) =>
              gone ? (
                <span
                  key={i}
                  className={`${GLYPH} shrink-0`}
                  style={{ marginLeft: partGap(look, i) }}
                />
              ) : (
                <ScrabbleTile
                  key={i}
                  letter={t.letter}
                  scored={!t.blank}
                  flash={flash ?? undefined}
                  armed={armed === i}
                  look={look}
                  gap={partGap(look, i)}
                  halo={look.good && i === 0}
                  diced={exit?.to === "dice"}
                  rod={look.fish && i === RACK_SIZE - 1}
                  bites={look.bites.filter((t) => t === i).length}
                  horns={
                    look.evil && i === 0
                      ? "devil"
                      : look.bull && i === RACK_SIZE - 1
                        ? "bull"
                        : undefined
                  }
                  glyph={
                    glyph
                      ? {
                          shape: glyph.shape,
                          tile: i,
                          delay: i * GLYPH_TIMING[glyph.shape].stagger,
                          char: glyph.chars?.[i],
                        }
                      : undefined
                  }
                  motion={motionFor(i)}
                  onClick={() => advance(i)}
                  ref={(el) => {
                    tileRefs.current[i] = el;
                  }}
                />
              ),
            )}
          </div>
        </DividerRow>
      </div>
      {shower && <Weather key={shower.id} shower={shower} color={CHARCOAL} />}
      {acid && <Acid key={acid.id} trip={acid.trip} />}
      {sudo > 0 && <Sudo key={sudo} onClose={() => setSudo(0)} />}
      {maga > 0 && (
        <div
          key={maga}
          aria-hidden
          onAnimationEnd={() => setMaga(0)}
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1.5 bg-[#c8102e]"
          style={{ animation: `scrabble-maga ${MAGA_MS}ms ease-out forwards` }}
        />
      )}
    </>
  );
}
