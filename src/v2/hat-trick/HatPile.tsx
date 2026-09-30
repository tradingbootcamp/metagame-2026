import type { CSSProperties } from "react";
import { hatAspect, hatCutoutStyle, type Hat, type HatId } from "./hats";
import stacking from "./stacking.json";

// The hats worn by the "You?" silhouette, stacked on its head. Rendered inside
// the card's square: the silhouette svg is 86% of the square and
// bottom-aligned, so its 100-unit box starts 14% down and is inset 7% each
// side; hat positions are in that box's units.
//
// Stack: every hat sits where stacking.json puts it relative to what's below
// it, the silhouette's head for the first one and the hat below for the rest
// (hand-placed per pair at /dev/hats/stack). A pair not placed yet just sits
// on the head, or box on box.

// [bottom][top] -> offset of the top hat's center from the bottom hat's
// center, or from the top of the head (YOU) for the `you` row.
export type StackBase = HatId | "you";
export type StackTable = Partial<
  Record<StackBase, Partial<Record<HatId, [number, number]>>>
>;
export const STACKING = stacking as StackTable;
export const YOU = { cx: 50, cy: 8 };

export type PlacedHat = { hat: Hat; width: number; cx: number; cy: number };

export function placeHats(hats: Hat[], table = STACKING): PlacedHat[] {
  return hats.reduce<(PlacedHat & { height: number })[]>((acc, hat) => {
    const width = hat.wear.width;
    const height = width / hatAspect(hat);
    const below = acc[acc.length - 1];
    const saved = table[below ? below.hat.id : "you"]?.[hat.id];
    const base = below ?? YOU;
    const cx = base.cx + (saved?.[0] ?? 0);
    const cy = saved
      ? base.cy + saved[1]
      : below
        ? below.cy - (below.height + height) / 2
        : 30 - height / 2;
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
