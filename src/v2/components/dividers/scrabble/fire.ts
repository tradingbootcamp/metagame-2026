// FIRE: a hot-rod flame silhouette — a row of S-curved licks with hooked tips
// and rounded valleys between them — standing on the tile's top edge and
// filled like the tile, so the two read as one shape. Drawn with the edge at
// y = 0 across x = 4…96; the skirt below 0 overlaps into the tile.
type Lick = [height: number, lean: 1 | -1];

const LICKS: Lick[] = [
  [36, 1],
  [60, -1],
  [46, 1],
  [30, -1],
];
const VALLEY = 4; // width of the rounded gap between licks
const LIFT = 9; // how far above the edge the valleys bottom out

// One lick in a unit box, leaning right: a fat belly low on the right, the
// tip flicking back over to the left. [outer edge up, inner edge down], each a
// cubic's two control points and its end.
// The belly swells past the lick's own slot and the tip reaches back across
// the other side, so neighbours overlap into one mass.
const UP = [-0.34, 0.42, 0.56, 0.52, 0.2, 1];
const DOWN = [0.66, 0.7, 1.48, 0.48, 1, 0];

export const FLAME = (() => {
  const w = (92 - VALLEY * (LICKS.length - 1)) / LICKS.length;
  const f = (n: number) => n.toFixed(1);
  let d = `M4 10V${-LIFT}`;
  LICKS.forEach(([h, lean], i) => {
    const x0 = 4 + i * (w + VALLEY);
    // A left-leaning lick is the same one mirrored, its edges taken in reverse
    // since the outline always runs left to right.
    const pt = (t: number, u: number) =>
      `${f(lean === 1 ? x0 + t * w : x0 + w - t * w)} ${f(-LIFT - u * (h - LIFT))}`;
    const curve = ([a, b, c, e, g, k]: number[]) =>
      `C${pt(a, b)} ${pt(c, e)} ${pt(g, k)}`;
    const back = ([a, b, c, e]: number[], [g, k]: number[]) =>
      `C${pt(c, e)} ${pt(a, b)} ${pt(g, k)}`;
    d +=
      lean === 1
        ? curve(UP) + curve(DOWN)
        : back(DOWN, [UP[4], UP[5]]) + back(UP, [0, 0]);
    if (i < LICKS.length - 1)
      d += `a${VALLEY / 2} ${VALLEY / 2} 0 0 0 ${VALLEY} 0`;
  });
  return `${d}V10Z`;
})();
