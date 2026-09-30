import type { CSSProperties } from "react";
import {
  hatAspect,
  hatBox,
  hatCutoutStyle,
  type Hat,
  type HatId,
} from "./hats";
import stacking from "./stacking.json";

// The hats worn by the "You?" silhouette, stacked on its head. Rendered inside
// the card's square: the silhouette svg is 86% of the square and
// bottom-aligned, so its 100-unit box starts 14% down and is inset 7% each
// side; hat positions are in that box's units.
//
// Stack: the first hat sits on the head by its `wear`; each later one, full
// size, sits where stacking.json puts it relative to the hat below
// (hand-placed per pair at /dev/hats/stack). A pair not placed yet falls back
// to resting the new hat's seat on the lower hat's top.

// [bottom][top] -> offset of the top hat's center from the bottom hat's, as
// placed with the bottom hat worn first.
export type StackTable = Partial<
  Record<HatId, Partial<Record<HatId, [number, number]>>>
>;
export const STACKING = stacking as StackTable;

export type PlacedHat = { hat: Hat; width: number; cx: number; cy: number };

export function placeHats(hats: Hat[], table = STACKING): PlacedHat[] {
  return hats.reduce<(PlacedHat & { top: number })[]>((acc, hat) => {
    const width = hat.wear.width;
    const height = width / hatAspect(hat);
    const { top, seat } = profile(hat, width, height);
    const below = acc[acc.length - 1];
    const saved = below && table[below.hat.id]?.[hat.id];
    const cx = saved ? below.cx + saved[0] : 50 + (hat.wear.shiftX ?? 0);
    const cy = saved
      ? below.cy + saved[1]
      : below
        ? below.cy + below.top - seat
        : hat.wear.bottom - height / 2;
    return [...acc, { hat, width, cx, cy, top }];
  }, []);
}

// One hat, centered on (cx, cy) in the pile's units.
export function WornHat({
  hat,
  width,
  cx,
  cy,
  className,
  style,
}: PlacedHat & {
  className?: string;
  style?: CSSProperties;
}) {
  const height = width / hatAspect(hat);
  return (
    <div
      className={`absolute ${className ?? ""}`}
      style={{
        ...hatCutoutStyle(hat),
        width: `${width}%`,
        left: `${cx - width / 2}%`,
        top: `${cy - height / 2}%`,
        transform: hat.wear.rotate
          ? `rotate(${hat.wear.rotate}deg)`
          : undefined,
        ...style,
      }}
    />
  );
}

export default function HatPile({ hats }: { hats: Hat[] }) {
  return (
    <div className="absolute inset-x-[7%] top-[14%] bottom-0">
      {placeHats(hats).map((p) => (
        <WornHat key={p.hat.id} {...p} />
      ))}
    </div>
  );
}

// Where a worn hat's outline reaches, as offsets from its center (the rotation
// origin), after its tilt: `top` is its highest point, and `seat` is the
// highest point of its underside across the middle of the hat, i.e. where a
// head (or the hat below) meets it.
function profile(hat: Hat, width: number, height: number) {
  const b = hatBox(hat);
  const a = ((hat.wear.rotate ?? 0) * Math.PI) / 180;
  const pts = hat.points.map(([x, y]) => {
    const px = ((x - b.x) / b.w - 0.5) * width;
    const py = ((y - b.y) / b.h - 0.5) * height;
    return [
      px * Math.cos(a) - py * Math.sin(a),
      px * Math.sin(a) + py * Math.cos(a),
    ];
  });
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const top = Math.min(...ys);
  const left = Math.min(...xs);
  const span = Math.max(...xs) - left;

  // Scan the middle 40% for the lowest crossing of the outline in each column.
  let seat = Infinity;
  for (let k = 0; k <= 20; k++) {
    const x = left + span * (0.3 + (0.4 * k) / 20);
    let low = -Infinity;
    pts.forEach(([x1, y1], j) => {
      const [x2, y2] = pts[(j + 1) % pts.length];
      if (x1 === x2 || (x - x1) * (x - x2) > 0) return;
      low = Math.max(low, y1 + ((x - x1) / (x2 - x1)) * (y2 - y1));
    });
    if (low > -Infinity) seat = Math.min(seat, low);
  }
  return { top, seat: seat < Infinity ? seat : Math.max(...ys) };
}
