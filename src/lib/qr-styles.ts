import type { Options } from "qr-code-styling";
import {
  arc,
  circle,
  rect,
  rotation,
  transform,
  type Cmd,
} from "@/lib/vector-path";

type DotType = NonNullable<Options["dotsOptions"]>["type"];
type EyeType = NonNullable<Options["cornersSquareOptions"]>["type"];
type EyeDotType = NonNullable<Options["cornersDotOptions"]>["type"];
type Shape = { label: string; dots: DotType; eye: EyeType; eyeDot: EyeDotType };

const SHAPES = {
  square: { label: "Square", dots: "square", eye: "square", eyeDot: "square" },
  dots: { label: "Dots", dots: "dots", eye: "extra-rounded", eyeDot: "dot" },
  rounded: {
    label: "Rounded",
    dots: "rounded",
    eye: "extra-rounded",
    eyeDot: "square",
  },
  blobby: {
    label: "Blobby",
    dots: "extra-rounded",
    eye: "extra-rounded",
    eyeDot: "dot",
  },
  classy: {
    label: "Classy",
    dots: "classy-rounded",
    eye: "extra-rounded",
    eyeDot: "dot",
  },
} as const satisfies Record<string, Shape>;

/** The links tool's catalog (rendered by qr-code-styling in the browser). */
export const LINK_QR_STYLES = {
  ...SHAPES,
  logo: { ...SHAPES.dots, label: "Logo", image: "/images/logo_square.png" },
} as const;

export type QrLogo = "mg2" | "die";

/**
 * The poster catalog, drawn as vectors by `qrShapes` (PDF and previews alike).
 * "rounded" is left off: its square eye centres inside rounded frames failed
 * jsQR's finder check on most 150 dpi poster renders ("dice" is the same
 * modules with round centres).
 */
export const POSTER_QR_STYLES = {
  square: SHAPES.square,
  dots: SHAPES.dots,
  blobby: SHAPES.blobby,
  classy: SHAPES.classy,
  mg2: { ...SHAPES.dots, label: "MG2 die", logo: "mg2" },
  die: { ...SHAPES.dots, label: "MG die, color", logo: "die" },
  // Finders as dice showing 1. A five-pip face broke the 1:1:3:1:1 finder
  // ratio and decoded nowhere.
  dice: { ...SHAPES.rounded, label: "Dice corners", eyeDot: "dot" },
} as const satisfies Record<string, Shape & { logo?: QrLogo }>;
export type PosterQrStyle = keyof typeof POSTER_QR_STYLES;
export const POSTER_QR_STYLE_KEYS = Object.keys(
  POSTER_QR_STYLES,
) as PosterQrStyle[];
export const isPosterQrStyle = (value: string): value is PosterQrStyle =>
  Object.hasOwn(POSTER_QR_STYLES, value);
export const posterQrLogo = (style: PosterQrStyle): QrLogo | undefined =>
  "logo" in POSTER_QR_STYLES[style]
    ? (POSTER_QR_STYLES[style] as { logo: QrLogo }).logo
    : undefined;

// Logo codes clear a centred, odd-sized block of modules, so it's symmetric
// about the centre module, at roughly this share of the width. Level H
// recovers ~30% of codewords; this clears ~5% of the modules.
const LOGO_SHARE = 0.22;

export type QrMatrix = { size: number; get(row: number, col: number): unknown };

export function logoClearing(size: number): number {
  const n = Math.round(size * LOGO_SHARE);
  return n % 2 ? n : n + 1;
}

/**
 * Filled outlines for a QR code in module units (top-left of the symbol at
 * 0,0, y down, no quiet zone), matching qr-code-styling's figures. Everything
 * winds the same way so a nonzero fill unions it. `clear` blanks a centred
 * block of that many modules for a logo.
 */
export function qrShapes(
  matrix: QrMatrix,
  style: PosterQrStyle,
  clear = 0,
): Cmd[] {
  const { dots, eye, eyeDot } = POSTER_QR_STYLES[style];
  const count = matrix.size;
  const lo = (count - clear) / 2;
  const hi = (count + clear) / 2;
  const inEye = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7);
  const visible = (r: number, c: number) =>
    r >= 0 &&
    c >= 0 &&
    r < count &&
    c < count &&
    !inEye(r, c) &&
    !(clear && r >= lo && r < hi && c >= lo && c < hi) &&
    !!matrix.get(r, c);
  const out: Cmd[] = [];
  for (let r = 0; r < count; r++)
    for (let c = 0; c < count; c++)
      if (visible(r, c))
        out.push(...dot(dots, c, r, (dx, dy) => visible(r + dy, c + dx)));
  for (const [col, row] of [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ]) {
    out.push(
      ...eyeFrame(eye, col, row),
      ...eyeCenter(eyeDot, col + 2, row + 2),
    );
  }
  return out;
}

// qr-code-styling's figure primitives, unit module at (x,y).
const turned = (cmds: Cmd[], angle: number, x: number, y: number, size = 1) =>
  angle ? transform(cmds, rotation(angle, x + size / 2, y + size / 2)) : cmds;
const square = (x: number, y: number) => rect(x, y, 1, 1);
const sideRounded = (x: number, y: number, a: number) =>
  turned(
    [
      ["M", x, y],
      ["L", x, y + 1],
      ["L", x + 0.5, y + 1],
      ...arc(x + 0.5, y + 1, 0.5, 0, x + 0.5, y),
      ["Z"],
    ],
    a,
    x,
    y,
  );
const cornerRounded = (x: number, y: number, a: number) =>
  turned(
    [
      ["M", x, y],
      ["L", x, y + 1],
      ["L", x + 1, y + 1],
      ["L", x + 1, y + 0.5],
      ...arc(x + 1, y + 0.5, 0.5, 0, x + 0.5, y),
      ["Z"],
    ],
    a,
    x,
    y,
  );
const cornerExtraRounded = (x: number, y: number, a: number) =>
  turned(
    [
      ["M", x, y],
      ["L", x, y + 1],
      ["L", x + 1, y + 1],
      ...arc(x + 1, y + 1, 1, 0, x, y),
      ["Z"],
    ],
    a,
    x,
    y,
  );
const cornersRounded = (x: number, y: number, a: number) =>
  turned(
    [
      ["M", x, y],
      ["L", x, y + 0.5],
      ...arc(x, y + 0.5, 0.5, 0, x + 0.5, y + 1),
      ["L", x + 1, y + 1],
      ["L", x + 1, y + 0.5],
      ...arc(x + 1, y + 0.5, 0.5, 0, x + 0.5, y),
      ["Z"],
    ],
    a,
    x,
    y,
  );

const Q = Math.PI / 2;

type PosterDot = (typeof POSTER_QR_STYLES)[PosterQrStyle]["dots"];

function dot(
  type: PosterDot,
  x: number,
  y: number,
  near: (dx: number, dy: number) => boolean,
): Cmd[] {
  if (type === "square") return square(x, y);
  if (type === "dots") return circle(x + 0.5, y + 0.5, 0.5);
  const left = near(-1, 0);
  const right = near(1, 0);
  const top = near(0, -1);
  const bottom = near(0, 1);
  const n = +left + +right + +top + +bottom;
  if (type === "classy-rounded") {
    if (n === 0) return cornersRounded(x, y, Q);
    if (!left && !top) return cornerExtraRounded(x, y, -Q);
    if (!right && !bottom) return cornerExtraRounded(x, y, Q);
    return square(x, y);
  }
  if (n === 0) return circle(x + 0.5, y + 0.5, 0.5);
  if (n > 2 || (left && right) || (top && bottom)) return square(x, y);
  if (n === 2) {
    const a =
      left && top ? Q : top && right ? Math.PI : right && bottom ? -Q : 0;
    return type === "extra-rounded"
      ? cornerExtraRounded(x, y, a)
      : cornerRounded(x, y, a);
  }
  const a = top ? Q : right ? Math.PI : bottom ? -Q : 0;
  return sideRounded(x, y, a);
}

function eyeFrame(type: EyeType, x: number, y: number): Cmd[] {
  if (type === "square")
    return [
      ...rect(x, y, 7, 7),
      ["M", x + 1, y + 1],
      ["L", x + 6, y + 1],
      ["L", x + 6, y + 6],
      ["L", x + 1, y + 6],
      ["Z"],
    ];
  // extra-rounded: a 7-module ring with 2.5/1.5-module corner radii
  return [
    ["M", x, y + 2.5],
    ["L", x, y + 4.5],
    ...arc(x, y + 4.5, 2.5, 0, x + 2.5, y + 7),
    ["L", x + 4.5, y + 7],
    ...arc(x + 4.5, y + 7, 2.5, 0, x + 7, y + 4.5),
    ["L", x + 7, y + 2.5],
    ...arc(x + 7, y + 2.5, 2.5, 0, x + 4.5, y),
    ["L", x + 2.5, y],
    ...arc(x + 2.5, y, 2.5, 0, x, y + 2.5),
    ["Z"],
    ["M", x + 2.5, y + 1],
    ["L", x + 4.5, y + 1],
    ...arc(x + 4.5, y + 1, 1.5, 1, x + 6, y + 2.5),
    ["L", x + 6, y + 4.5],
    ...arc(x + 6, y + 4.5, 1.5, 1, x + 4.5, y + 6),
    ["L", x + 2.5, y + 6],
    ...arc(x + 2.5, y + 6, 1.5, 1, x + 1, y + 4.5),
    ["L", x + 1, y + 2.5],
    ...arc(x + 1, y + 2.5, 1.5, 1, x + 2.5, y + 1),
    ["Z"],
  ];
}

function eyeCenter(type: EyeDotType, x: number, y: number): Cmd[] {
  return type === "dot" ? circle(x + 1.5, y + 1.5, 1.5) : rect(x, y, 3, 3);
}
