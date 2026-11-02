import type { CSSProperties } from "react";
import type { MegagameClass } from "@/lib/megagame-levels";

// The three faction emblems, drawn in a 200-unit box. They grew out of Libi's
// "Faction patches" brand piece (the Photo Brand Elements hub on Hubs). The
// colours are the factions' brand colours from her notes.

export const NAVY = "#173059";
export const CREAM = "#FFFBF2";
export const FACTION_COLORS: Record<MegagameClass, string> = {
  wizard: "#3B00B8",
  pirate: "#B8AA00",
  alien: "#00B891",
};
// The ribbon text colour on each faction colour.
export const FACTION_ON: Record<MegagameClass, string> = {
  wizard: CREAM,
  pirate: NAVY,
  alien: NAVY,
};

const V = { soft: "#E6DCFF", sky: "#CEE1FF" };
const P = { pale: "#F6EFC2" };
const A = {
  space: "#0F1430",
  star: "#FFF5E6",
  pink: "#FF5FA2",
  mint: "#59E3B0",
  pale: "#CFF7EA",
};

const DISPLAY: CSSProperties = { fontFamily: "var(--font-bebas), sans-serif" };
const GROTESK: CSSProperties = {
  fontFamily: "var(--font-space-grotesk), sans-serif",
  fontWeight: 700,
};

// Each emblem comes alive while its button (a `group`) is hovered or focused.
const FLOAT =
  "motion-safe:group-hover:animate-[mg-float_1.6s_ease-in-out_infinite] motion-safe:group-focus-visible:animate-[mg-float_1.6s_ease-in-out_infinite]";
const THROB =
  "origin-center [transform-box:fill-box] motion-safe:group-hover:animate-[mg-throb_1.1s_ease-in-out_infinite] motion-safe:group-focus-visible:animate-[mg-throb_1.1s_ease-in-out_infinite]";
const PULSE =
  "motion-safe:group-hover:animate-[mg-pulse_1.6s_ease-in-out_infinite] motion-safe:group-focus-visible:animate-[mg-pulse_1.6s_ease-in-out_infinite]";

const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s}c${s * 0.12} ${s * 0.7} ${s * 0.3} ${s * 0.88} ${s} ${s}c${-s * 0.7} ${s * 0.12} ${-s * 0.88} ${s * 0.3} ${-s} ${s}c${-s * 0.12} ${-s * 0.7} ${-s * 0.3} ${-s * 0.88} ${-s} ${-s}c${s * 0.7} ${-s * 0.12} ${s * 0.88} ${-s * 0.3} ${s} ${-s}Z`;

// [letter, x, y, size, rotation, colour]
const LETTERS: [string, number, number, number, number, string][] = [
  ["A", 74, 119, 26, -12, CREAM],
  ["Z", 126, 119, 24, 12, CREAM],
  ["R", 100, 110, 19, 0, V.soft],
  ["K", 50, 104, 22, -24, V.sky],
  ["S", 150, 104, 22, 24, V.sky],
  ["E", 45, 76, 18, -28, V.soft],
  ["W", 155, 76, 19, 26, V.soft],
  ["T", 64, 52, 16, -16, CREAM],
  ["O", 136, 52, 16, 16, CREAM],
];

function Wizard() {
  const c = FACTION_COLORS.wizard;
  return (
    <>
      <path
        d="M100 4 188 36v64c0 50-38 82-88 96-50-14-88-46-88-96V36Z"
        fill={c}
      />
      <path
        d="M100 17 175 45v55c0 42-32 70-75 82-43-12-75-40-75-82V45Z"
        fill="none"
        stroke={V.soft}
        strokeWidth="3"
      />
      <path d={sparkle(100, 62, 24)} fill={CREAM} />
      <g textAnchor="middle" style={DISPLAY}>
        {LETTERS.map(([ch, x, y, size, rot, fill], i) => (
          <g
            key={ch}
            className={FLOAT}
            style={{ animationDelay: `${-i * 0.18}s` }}
          >
            <text
              x={x}
              y={y}
              fontSize={size}
              fill={fill}
              transform={`rotate(${rot} ${x} ${y})`}
            >
              {ch}
            </text>
          </g>
        ))}
      </g>
      <g fill={V.sky}>
        <circle cx="100" cy="121" r="2.2" />
        <circle cx="93" cy="117" r="1.6" />
        <circle cx="107" cy="117" r="1.6" />
      </g>
      <path
        d="M42 126c22-10 44-8 58 4 14-12 36-14 58-4v36c-22-10-44-8-58 4-14-12-36-14-58-4Z"
        fill={CREAM}
        stroke={V.soft}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M100 130v36" stroke={c} strokeWidth="3" />
      <path
        d="M54 137c12-4 25-4 36 1M54 148c12-4 25-4 36 1M110 138c11-5 24-5 36-1M110 149c11-5 24-5 36-1"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity=".5"
      />
    </>
  );
}

// A 5×5 maze in grid units: its one route leads in at the bottom left, round
// the right side and into the centre cell, where the X is.
const MAZE_WALLS: [number, number, number, number][] = [
  [0, 0, 5, 0],
  [5, 0, 5, 5],
  [1, 5, 5, 5],
  [0, 0, 0, 5],
  [2, 0, 2, 1],
  [4, 1, 5, 1],
  [1, 1, 4, 1],
  [1, 1, 1, 4],
  [1, 4, 4, 4],
  [4, 1, 4, 2],
  [4, 3, 4, 4],
  [1, 2, 2, 2],
  [2, 2, 2, 3],
  [2, 3, 3, 3],
  [3, 2, 3, 3],
];
const MAZE_CELL = 12;
const mx = (u: number) => 70 + u * MAZE_CELL;
const my = (v: number) => 76 + v * MAZE_CELL;

function Pirate() {
  const c = FACTION_COLORS.pirate;
  return (
    <>
      <path
        d="M8 38c34-14 62 10 96 0s58-12 88 0v124c-30-12-54-10-88 0s-62-14-96 0Z"
        fill={NAVY}
        transform="translate(100 100) scale(1.06) translate(-100 -100)"
      />
      {/* Scaled about where the bones cross, so every knob sits on the flag. */}
      <g transform="translate(100 106) scale(.85) translate(-100 -106)">
        <path
          d="M50 146 150 66M50 66l100 80"
          stroke={c}
          strokeWidth="13"
          strokeLinecap="round"
        />
        <g fill={c}>
          {[
            [42, 142],
            [54, 154],
            [158, 142],
            [146, 154],
            [42, 70],
            [54, 58],
            [158, 70],
            [146, 58],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="9" />
          ))}
        </g>
      </g>
      {/* Turned 45° so its corners sit between the bones. */}
      <g transform="rotate(45 100 106)">
        <rect
          x="63"
          y="69"
          width="74"
          height="74"
          rx="5"
          fill={P.pale}
          stroke={NAVY}
          strokeWidth="3"
        />
        <g stroke={NAVY} strokeWidth="3.2" strokeLinecap="square">
          {MAZE_WALLS.map(([a, b, x, y]) => (
            <path
              key={`${a}${b}${x}${y}`}
              d={`M${mx(a)} ${my(b)}L${mx(x)} ${my(y)}`}
            />
          ))}
        </g>
      </g>
      {/* Upright, unlike the maze: turned, an X reads as a plus. */}
      <g className={THROB}>
        <path
          d="M96 102 104 110M104 102 96 110"
          stroke="#D8502B"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

const BLOCKS: [number, number, number, number][] = [
  [72, 128, -10, 3],
  [100, 100, 8, 1],
  [128, 126, -6, 4],
];

function Alien() {
  const c = FACTION_COLORS.alien;
  return (
    <>
      <circle cx="100" cy="100" r="98" fill={A.space} />
      <g fill={A.star}>
        {[
          [40, 82, 2],
          [160, 92, 2],
          [150, 30, 2.5],
          [34, 120, 1.8],
          [168, 130, 1.8],
        ].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      <circle cx="36" cy="104" r="9" fill={A.pink} />
      <ellipse
        cx="36"
        cy="104"
        rx="17"
        ry="4.4"
        fill="none"
        stroke={A.star}
        strokeWidth="2.5"
        transform="rotate(-18 36 104)"
      />
      <path
        d="M80 56H120L158 150H42Z"
        fill={A.mint}
        opacity=".28"
        className={PULSE}
      />
      <path d="M12.7 140Q100 118 187.3 140A96 96 0 0 1 12.7 140Z" fill={c} />
      {BLOCKS.map(([x, y, rot, n], i) => (
        <g key={n} className={FLOAT} style={{ animationDelay: `${-i * 0.4}s` }}>
          <g transform={`translate(${x} ${y}) rotate(${rot})`}>
            <rect
              x="-13"
              y="-13"
              width="26"
              height="26"
              rx="4"
              fill={A.star}
              stroke={A.pale}
              strokeWidth="2.5"
            />
            <text
              y="7"
              textAnchor="middle"
              fontSize="19"
              fill={A.space}
              style={GROTESK}
            >
              {n}
            </text>
          </g>
        </g>
      ))}
      <g className={FLOAT} style={{ animationDuration: "2.2s" }}>
        <g transform="translate(100 50) scale(.9)">
          <path
            d="M-26 -4c3-24 49-24 52 0Z"
            fill={A.mint}
            stroke={A.star}
            strokeWidth="4"
          />
          <ellipse
            rx="52"
            ry="14"
            fill={A.pale}
            stroke={A.star}
            strokeWidth="4"
          />
          <g fill={A.pink}>
            <circle cx="-32" cy="1" r="4" />
            <circle cx="-11" cy="5" r="4" />
            <circle cx="11" cy="5" r="4" />
            <circle cx="32" cy="1" r="4" />
          </g>
        </g>
      </g>
      <circle cx="100" cy="100" r="93" fill="none" stroke={c} strokeWidth="5" />
    </>
  );
}

const EMBLEMS: Record<MegagameClass, () => React.ReactElement> = {
  wizard: Wizard,
  pirate: Pirate,
  alien: Alien,
};

/** A faction's emblem as nested SVG content, for placing inside a larger SVG. */
export function EmblemContent({ faction }: { faction: MegagameClass }) {
  const Emblem = EMBLEMS[faction];
  return <Emblem />;
}
