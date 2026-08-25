import { useId, type CSSProperties } from "react";
import { letterPaths } from "@/lib/dice-letter-paths";

// Parametric SVG rebuild of the METAGAME dice wordmark (images/logo.png in the
// mock). Each die is a true-isometric cube: the side "faces" are the dice-letter
// glyphs themselves (full-bleed rounded squares with cutouts) sheared onto the
// cube, with a white copy offset behind so it peeks through the cutouts — the
// highlight in the drawing. `highlight` toggles that illusion off.
// Recolor via CSS vars: --ld-top, --ld-left, --ld-right, --ld-ink, --ld-pip, --ld-hi.

const LETTER_PATHS = letterPaths({ slot: 52, r: 48 });

// Reading order M-E-T-A-G-A-M-E across the dice; left faces stay blue and
// right faces orange, so the letters alternate color in reading order.
const DICE: { left: string; right: string; pips: number }[] = [
  { left: "m", right: "e", pips: 2 },
  { left: "t", right: "a", pips: 0 },
  { left: "g", right: "a", pips: 2 },
  { left: "m", right: "e", pips: 6 },
];

// Face-local pip centers on a 512×512 top face (the "2" runs along the local
// diagonal, which projects to a horizontal pair).
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  2: [
    [140, 140],
    [372, 372],
  ],
  6: [
    [150, 118],
    [150, 256],
    [150, 394],
    [362, 118],
    [362, 256],
    [362, 394],
  ],
};

const S = 512; // cube edge in projected units; faces are 512×512 local space
const H = 0.8660254 * S; // horizontal half-width of the hexagon silhouette

// Isometric projection: each face maps its 512×512 local space onto a
// parallelogram of the cube silhouette (SVG matrix = [x-basis, y-basis, origin]).
const K = 0.8660254;
const TOP_MATRIX = `matrix(${K} -0.5 ${K} 0.5 ${-H} ${-S / 2})`;
const LEFT_MATRIX = `matrix(${K} 0.5 0 1 ${-H} ${-S / 2})`;
const RIGHT_MATRIX = `matrix(${K} -0.5 0 1 0 0)`;

// Each face insets independently from its exterior (silhouette) edges and its
// interior (shared-channel) edges, so rim thickness and channel width are
// separate knobs. Which local edges are which differs per face.
// The shared vertical edge is foreshortened by cos30 on screen, so M_SIDE is
// set so 2·M_SIDE·cos30 ≈ the exterior rim (44 stroke + M_EXT) and the black
// channel between the two letters reads as wide as the rim around them.
const M_EXT = 10;
const M_INT = 17;
const M_SIDE = 30;
const M_TOP = 34; // top face's two interior edges, so it sits clear of the letters
const KF = (512 - M_INT - M_EXT) / 512;
const KX = (512 - M_SIDE - M_EXT) / 512;
const KT = (512 - M_TOP - M_EXT) / 512;
const INSET_TOP = `translate(${M_TOP} ${M_EXT}) scale(${KT})`;
const INSET_LEFT = `translate(${M_EXT} ${M_INT}) scale(${KX} ${KF})`;
const INSET_RIGHT = `translate(${M_SIDE} ${M_INT}) scale(${KX} ${KF})`;

// Highlight copies mirror horizontally between the two faces so the implied
// light comes from one consistent direction across the cube edge.
const HI = 8;

// Optional drop shadow under each die (face units), for dice on dark grounds.
const SHADOW_DY = 28;
const SHADOW_BLUR = 22;
const SHADOW_OPACITY = 0.35;
const SHADOW_PAD = SHADOW_DY + 3 * SHADOW_BLUR + 32;
const HI_LEFT = `translate(${HI} ${-HI})`;
const HI_RIGHT = `translate(${-HI} ${-HI})`;

// Silhouette corner rounding, matching the faces' own corner radius.
const CORNER = 44;
const VERTS: [number, number][] = [
  [0, -S],
  [H, -S / 2],
  [H, S / 2],
  [0, S],
  [-H, S / 2],
  [-H, -S / 2],
];
const HEX = VERTS.map(([vx, vy], i) => {
  const [px, py] = VERTS[(i + VERTS.length - 1) % VERTS.length];
  const [nx, ny] = VERTS[(i + 1) % VERTS.length];
  const unit = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy);
    return [dx / len, dy / len];
  };
  const [ux, uy] = unit(vx - px, vy - py);
  const [wx, wy] = unit(nx - vx, ny - vy);
  const f = (v: number) => +v.toFixed(1);
  const cmd = i === 0 ? "M" : "L";
  return `${cmd}${f(vx - ux * CORNER)} ${f(vy - uy * CORNER)} Q${f(vx)} ${f(vy)} ${f(vx + wx * CORNER)} ${f(vy + wy * CORNER)}`;
})
  .join(" ")
  .concat(" Z");

const PITCH = 2 * H + 90; // die width + gap, matching the mock's spacing

// Nav logo viewBox height and the aspect ratios of its two states (full
// wordmark vs. single die), so the wrapper can animate width from --nav-h.
const NAV_VB_H = 2 * S + 64;
const NAV_AR_FULL = (3 * PITCH + 2 * H + 64) / NAV_VB_H;
const NAV_AR_ONE = (2 * H + 64) / NAV_VB_H;

function Letter({
  glyph,
  fill,
  hiOffset,
}: {
  glyph: string;
  fill: string;
  hiOffset: string | null;
}) {
  const d = LETTER_PATHS[glyph];
  return (
    <>
      {hiOffset && (
        <path
          d={d}
          transform={hiOffset}
          fill="var(--ld-hi, #fff)"
          fillRule="evenodd"
        />
      )}
      <path d={d} fill={fill} fillRule="evenodd" />
    </>
  );
}

function Die({
  left,
  right,
  pips,
  highlight,
  renderRight = true,
}: {
  left: string;
  right: string;
  pips: number;
  highlight: boolean;
  renderRight?: boolean;
}) {
  return (
    <>
      <path
        d={HEX}
        fill="var(--ld-ink, #000)"
        stroke="var(--ld-ink, #000)"
        strokeWidth={44}
        strokeLinejoin="round"
      />
      <g transform={`${TOP_MATRIX} ${INSET_TOP}`}>
        <rect width={S} height={S} rx={48} fill="var(--ld-top, #232323)" />
        {(PIP_LAYOUTS[pips] ?? []).map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={42}
            fill="var(--ld-pip, #fff)"
          />
        ))}
      </g>
      <g transform={`${LEFT_MATRIX} ${INSET_LEFT}`}>
        <Letter
          glyph={left}
          fill="var(--ld-left, #1EA1FF)"
          hiOffset={highlight ? HI_LEFT : null}
        />
      </g>
      {renderRight && (
        <g transform={`${RIGHT_MATRIX} ${INSET_RIGHT}`}>
          <Letter
            glyph={right}
            fill="var(--ld-right, #FFAB3F)"
            hiOffset={highlight ? HI_RIGHT : null}
          />
        </g>
      )}
    </>
  );
}

// A single die, tightly cropped — the compact "MG" brand mark (M on the blue
// left face, G on the tan right face, 2 pips up top), matching the favicon.
// Same projection/glyph system as the full wordmark.
export function LogoDie({
  left = "m",
  right = "g",
  pips = 2,
  className,
  style,
  highlight = false,
}: {
  left?: string;
  right?: string;
  pips?: number;
  className?: string;
  style?: CSSProperties;
  highlight?: boolean;
}) {
  return (
    <svg
      viewBox={`${-H - 32} ${-S - 32} ${2 * H + 64} ${2 * S + 64}`}
      className={className}
      style={style}
      role="img"
      aria-label="Metagame"
    >
      <Die left={left} right={right} pips={pips} highlight={highlight} />
    </svg>
  );
}

// The nav wordmark that morphs between the compact single die (collapsed) and
// the full METAGAME wordmark (expanded). Pure/props-only so it stays a server
// component; the caller drives `expanded` and sets --nav-h. Die 0 renders its
// own right face here so the "G" can crossfade to "E" as dice 1–3 pop in.
export function NavLogo({
  expanded,
  durationMs = 460,
  className,
  style,
}: {
  expanded: boolean;
  // Overall unfold time; the per-die stagger and crossfade scale with it.
  durationMs?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const k = durationMs / 460;
  const ms = (base: number) => `${Math.round(base * k)}ms`;
  return (
    <span
      className={`block overflow-hidden ${className ?? ""}`}
      style={{
        height: "var(--nav-h)",
        width: `calc(var(--nav-h) * ${expanded ? NAV_AR_FULL : NAV_AR_ONE})`,
        transition: `width ${durationMs}ms cubic-bezier(0.22,1,0.36,1)`,
        ...style,
      }}
    >
      <svg
        viewBox={`${-H - 32} ${-S - 32} ${3 * PITCH + 2 * H + 64} ${2 * S + 64}`}
        className="block h-full w-auto"
        role="img"
        aria-label="Metagame"
      >
        <g>
          <Die left="m" right="e" pips={2} highlight renderRight={false} />
          <g transform={`${RIGHT_MATRIX} ${INSET_RIGHT}`}>
            <g
              style={{
                opacity: expanded ? 0 : 1,
                transition: `opacity ${ms(200)} ease`,
                transitionDelay: expanded ? "0ms" : ms(120),
              }}
            >
              <Letter
                glyph="g"
                fill="var(--ld-right, #FFAB3F)"
                hiOffset={HI_RIGHT}
              />
            </g>
            <g
              style={{
                opacity: expanded ? 1 : 0,
                transition: `opacity ${ms(200)} ease`,
              }}
            >
              <Letter
                glyph="e"
                fill="var(--ld-right, #FFAB3F)"
                hiOffset={HI_RIGHT}
              />
            </g>
          </g>
        </g>
        {[1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${i * PITCH} 0)`}>
            <g
              style={{
                opacity: expanded ? 1 : 0,
                transform: expanded ? "scale(1)" : "scale(0.5)",
                transformBox: "fill-box",
                transformOrigin: "center",
                transition: `opacity ${ms(200)} ease, transform ${ms(240)} cubic-bezier(0.22,1,0.36,1)`,
                transitionDelay: expanded ? ms(i * 80) : ms((3 - i) * 40),
              }}
            >
              <Die
                left={DICE[i].left}
                right={DICE[i].right}
                pips={DICE[i].pips}
                highlight
              />
            </g>
          </g>
        ))}
      </svg>
    </span>
  );
}

export default function LogoDice({
  className,
  style,
  highlight = false,
  shadow = false,
}: {
  className?: string;
  style?: CSSProperties;
  highlight?: boolean;
  shadow?: boolean;
}) {
  const shadowId = useId();
  // The blurred shadow reaches well past the silhouette; give it canvas.
  const pad = shadow ? SHADOW_PAD : 32;
  return (
    <svg
      viewBox={`${-H - pad} ${-S - pad} ${3 * PITCH + 2 * H + 2 * pad} ${2 * S + 2 * pad}`}
      className={className}
      style={style}
      role="img"
      aria-label="Metagame"
    >
      {shadow && (
        <defs>
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow
              dx="0"
              dy={SHADOW_DY}
              stdDeviation={SHADOW_BLUR}
              floodColor="var(--ld-shadow, #fff)"
              floodOpacity={SHADOW_OPACITY}
            />
          </filter>
        </defs>
      )}
      {DICE.map((die, i) => (
        <g
          key={i}
          transform={`translate(${i * PITCH} 0)`}
          filter={shadow ? `url(#${shadowId})` : undefined}
        >
          <Die {...die} highlight={highlight} />
        </g>
      ))}
    </svg>
  );
}
