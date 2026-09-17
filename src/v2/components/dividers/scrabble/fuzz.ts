// FUZZ: short hairs standing off a tile's outline. The outline is a rounded
// rect whose top and bottom radii can differ (BALL and DEAD change them), or
// an ellipse filling the box (OVAL).
type Box = { x: number; y: number; width: number; height: number };

// Deterministic, so the server and client draw the same hairs.
const noise = (i: number) => {
  const v = Math.sin(i * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

const SPACING = 6;

export function hairs(
  box: Box,
  top: number,
  bottom: number,
  oval: boolean,
): string {
  const { x, y, width: w, height: h } = box;
  const roots: [x: number, y: number, normal: number][] = [];
  const line = (ax: number, ay: number, bx: number, by: number, n: number) => {
    const count = Math.round(Math.hypot(bx - ax, by - ay) / SPACING);
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count;
      roots.push([ax + (bx - ax) * t, ay + (by - ay) * t, n]);
    }
  };
  const arc = (cx: number, cy: number, r: number, from: number) => {
    const count = Math.round((r * Math.PI) / 2 / SPACING);
    for (let k = 0; k < count; k++) {
      const a = from + ((k + 0.5) / count) * (Math.PI / 2);
      roots.push([cx + r * Math.cos(a), cy + r * Math.sin(a), a]);
    }
  };
  const Q = Math.PI / 2;
  if (oval) {
    const [a, b] = [w / 2, h / 2];
    const count = Math.round((Math.PI * (a + b)) / SPACING);
    for (let k = 0; k < count; k++) {
      const t = (k / count) * 4 * Q;
      roots.push([
        x + a + a * Math.cos(t),
        y + b + b * Math.sin(t),
        Math.atan2(Math.sin(t) / b, Math.cos(t) / a),
      ]);
    }
  } else {
    line(x + top, y, x + w - top, y, -Q);
    arc(x + w - top, y + top, top, -Q);
    line(x + w, y + top, x + w, y + h - bottom, 0);
    arc(x + w - bottom, y + h - bottom, bottom, 0);
    line(x + w - bottom, y + h, x + bottom, y + h, Q);
    arc(x + bottom, y + h - bottom, bottom, Q);
    line(x, y + h - bottom, x, y + top, 2 * Q);
    arc(x + top, y + top, top, 2 * Q);
  }

  return roots
    .map(([px, py, normal], i) => {
      const a = normal + (noise(i) - 0.5) * 0.9;
      const len = 4 + noise(i + 99) * 5;
      // Rooted just inside the edge so there's no gap at the base.
      const r = (n: number) => n.toFixed(1);
      return `M${r(px - Math.cos(normal))} ${r(py - Math.sin(normal))}l${r(Math.cos(a) * len)} ${r(Math.sin(a) * len)}`;
    })
    .join("");
}
