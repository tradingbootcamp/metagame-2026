import { hatAspect, hatCutoutStyle, type Hat } from "./hats";

// The hats worn by the "You?" silhouette, stacked on its head. Rendered inside
// the card's square: the silhouette svg is 86% of the square and
// bottom-aligned, so its 100-unit box starts 14% down and is inset 7% each
// side; hat positions are in that box's units.
//
// Stack: the first hat sits on the head; each later one perches on the hat
// below, a bit smaller, its bottom edge `lift` units above that hat's center.
export default function HatPile({ hats }: { hats: Hat[] }) {
  const stack = hats.reduce<
    { hat: Hat; width: number; top: number; bottom: number }[]
  >((acc, hat, i) => {
    const width = hat.wear.width * 0.85 ** i;
    const height = width / hatAspect(hat);
    const below = acc[acc.length - 1];
    const bottom = below
      ? (below.top + below.bottom) / 2 -
        (hat.wear.lift ?? (below.bottom - below.top) * 0.18)
      : hat.wear.bottom;
    return [...acc, { hat, width, top: bottom - height, bottom }];
  }, []);

  return (
    <div className="absolute inset-x-[7%] top-[14%] bottom-0">
      {stack.map(({ hat, width, top }) => (
        <div
          key={hat.id}
          className="absolute"
          style={{
            ...hatCutoutStyle(hat),
            width: `${width}%`,
            left: `${50 - width / 2 + (hat.wear.shiftX ?? 0)}%`,
            top: `${top}%`,
            transform: hat.wear.rotate
              ? `rotate(${hat.wear.rotate}deg)`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
