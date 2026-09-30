import type { CSSProperties } from "react";
import { hatAspect, hatCutoutStyle, type Hat, type HatId } from "./hats";
import stacking from "./stacking.json";

// The hats worn by the "You?" silhouette, stacked on its head. Rendered inside
// the card's square: the silhouette svg is 86% of the square and
// bottom-aligned, so its 100-unit box starts 14% down and is inset 7% each
// side; hat positions are in that box's units.
//
// Stack: the first hat sits on the head by its `wear`; each later one, full
// size, sits where stacking.json puts it relative to the hat below
// (hand-placed per pair at /dev/hats/stack). A pair not placed yet just
// stacks box on box.

// [bottom][top] -> offset of the top hat's center from the bottom hat's, as
// placed with the bottom hat worn first.
export type StackTable = Partial<
  Record<HatId, Partial<Record<HatId, [number, number]>>>
>;
export const STACKING = stacking as StackTable;

export type PlacedHat = { hat: Hat; width: number; cx: number; cy: number };

export function placeHats(hats: Hat[], table = STACKING): PlacedHat[] {
  return hats.reduce<(PlacedHat & { height: number })[]>((acc, hat) => {
    const width = hat.wear.width;
    const height = width / hatAspect(hat);
    const below = acc[acc.length - 1];
    const saved = below && table[below.hat.id]?.[hat.id];
    const cx = saved ? below.cx + saved[0] : 50 + (hat.wear.shiftX ?? 0);
    const cy = saved
      ? below.cy + saved[1]
      : below
        ? below.cy - (below.height + height) / 2
        : hat.wear.bottom - height / 2;
    return [...acc, { hat, width, cx, cy, height }];
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
