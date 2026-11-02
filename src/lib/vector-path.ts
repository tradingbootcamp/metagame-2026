// Minimal vector paths shared by the QR styles' SVG previews and the poster
// PDF, which has no SVG renderer: only absolute M/L/C/Z survive, so arcs and
// quadratics become cubics up front and any affine transform applies exactly.
export type Cmd =
  | ["M", number, number]
  | ["L", number, number]
  | ["C", number, number, number, number, number, number]
  | ["Z"];
/** SVG matrix order: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function transform(cmds: Cmd[], m: Matrix): Cmd[] {
  return cmds.map((cmd): Cmd => {
    switch (cmd[0]) {
      case "M":
      case "L":
        return [cmd[0], ...apply(m, cmd[1], cmd[2])];
      case "C":
        return [
          "C",
          ...apply(m, cmd[1], cmd[2]),
          ...apply(m, cmd[3], cmd[4]),
          ...apply(m, cmd[5], cmd[6]),
        ];
      default:
        return cmd;
    }
  });
}

/** Parses an SVG `transform` list of matrix/translate/scale/rotate. */
export function parseTransform(value: string): Matrix {
  let m = IDENTITY;
  for (const [, name, args] of value.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const n = args
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const next: Matrix =
      name === "matrix"
        ? (n as Matrix)
        : name === "translate"
          ? [1, 0, 0, 1, n[0], n[1] ?? 0]
          : name === "scale"
            ? [n[0], 0, 0, n[1] ?? n[0], 0, 0]
            : name === "rotate"
              ? rotation((n[0] * Math.PI) / 180, n[1] ?? 0, n[2] ?? 0)
              : (() => {
                  throw new Error(`Unsupported transform ${name}`);
                })();
    m = multiply(m, next);
  }
  return m;
}

export function rotation(angle: number, cx = 0, cy = 0): Matrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    cos,
    sin,
    -sin,
    cos,
    cx - cos * cx + sin * cy,
    cy - sin * cx - cos * cy,
  ];
}

/** Absolute M/L/H/V/Q/C/Z path data, as used by the dice glyphs. */
export function parsePath(d: string): Cmd[] {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const cmds: Cmd[] = [];
  let x = 0;
  let y = 0;
  let start: [number, number] = [0, 0];
  let op = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) op = tokens[i++];
    switch (op) {
      case "M":
        x = num();
        y = num();
        start = [x, y];
        cmds.push(["M", x, y]);
        op = "L";
        break;
      case "L":
        x = num();
        y = num();
        cmds.push(["L", x, y]);
        break;
      case "H":
        x = num();
        cmds.push(["L", x, y]);
        break;
      case "V":
        y = num();
        cmds.push(["L", x, y]);
        break;
      case "Q": {
        const qx = num();
        const qy = num();
        const ex = num();
        const ey = num();
        cmds.push(quadratic(x, y, qx, qy, ex, ey));
        x = ex;
        y = ey;
        break;
      }
      case "C": {
        const c = [num(), num(), num(), num(), num(), num()] as const;
        cmds.push(["C", ...c]);
        x = c[4];
        y = c[5];
        break;
      }
      case "Z":
        cmds.push(["Z"]);
        [x, y] = start;
        break;
      default:
        throw new Error(`Unsupported path command ${op}`);
    }
  }
  return cmds;
}

function quadratic(
  x0: number,
  y0: number,
  qx: number,
  qy: number,
  x: number,
  y: number,
): Cmd {
  return [
    "C",
    x0 + (2 / 3) * (qx - x0),
    y0 + (2 / 3) * (qy - y0),
    x + (2 / 3) * (qx - x),
    y + (2 / 3) * (qy - y),
    x,
    y,
  ];
}

/**
 * A circular arc from (x0,y0) to (x,y), SVG `A r r 0 0 sweep x y` semantics
 * (never the large arc), as one cubic per ≤90° step.
 */
export function arc(
  x0: number,
  y0: number,
  r: number,
  sweep: 0 | 1,
  x: number,
  y: number,
): Cmd[] {
  const mx = (x - x0) / 2;
  const my = (y - y0) / 2;
  const half = Math.hypot(mx, my);
  const h = Math.sqrt(Math.max(0, r * r - half * half));
  // Centre sits left of the chord for sweep=0 in y-down space, right for 1.
  const sign = sweep ? 1 : -1;
  const cx = x0 + mx - (sign * h * my) / half;
  const cy = y0 + my + (sign * h * mx) / half;
  const a0 = Math.atan2(y0 - cy, x0 - cx);
  let delta = Math.atan2(y - cy, x - cx) - a0;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / steps;
  const k = (4 / 3) * Math.tan(step / 4);
  const out: Cmd[] = [];
  for (let s = 0; s < steps; s++) {
    const t0 = a0 + s * step;
    const t1 = t0 + step;
    out.push([
      "C",
      cx + r * (Math.cos(t0) - k * Math.sin(t0)),
      cy + r * (Math.sin(t0) + k * Math.cos(t0)),
      cx + r * (Math.cos(t1) + k * Math.sin(t1)),
      cy + r * (Math.sin(t1) - k * Math.cos(t1)),
      s === steps - 1 ? x : cx + r * Math.cos(t1),
      s === steps - 1 ? y : cy + r * Math.sin(t1),
    ]);
  }
  return out;
}

/** A full circle, wound counter-clockwise on screen (like qr-code-styling's shapes) unless `clockwise`. */
export function circle(
  cx: number,
  cy: number,
  r: number,
  clockwise = false,
): Cmd[] {
  const sweep = clockwise ? 1 : 0;
  return [
    ["M", cx, cy - r],
    ...arc(cx, cy - r, r, sweep, cx, cy + r),
    ...arc(cx, cy + r, r, sweep, cx, cy - r),
    ["Z"],
  ];
}

export function rect(x: number, y: number, w: number, h: number): Cmd[] {
  return [
    ["M", x, y],
    ["L", x, y + h],
    ["L", x + w, y + h],
    ["L", x + w, y],
    ["Z"],
  ];
}

const fmt = (n: number) => +n.toFixed(3);

export function toSvgPath(cmds: Cmd[]): string {
  return cmds
    .map((cmd) => cmd[0] + (cmd.slice(1) as number[]).map(fmt).join(" "))
    .join("");
}
