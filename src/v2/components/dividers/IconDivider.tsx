// Shared renderer for a divider built from game-icons.net glyphs. Each icon is a
// single-path SVG (its black background rect stripped) recoloured to the charcoal
// the piece-set dividers share. Per-set source + attribution lives in each set's
// icons.ts (game-icons.net art is CC BY 3.0 — keep the credit).
import type { Game } from "@/v2/puzzle/store";
import DividerRow from "./DividerRow";
import { GLYPH, SHADOW } from "./sizing";

const CHARCOAL = "#4d4d4d";

export type GameIcon = {
  name: string;
  viewBox: string;
  // Single-path sets pass `d`; multi-element sets (Noun Project art with several
  // paths/polygons/rects) pass `paths` so each shape fills independently — the
  // safe union, without cross-shape winding turning overlaps into holes.
  d?: string;
  paths?: string[];
  fillRule?: "evenodd" | "nonzero";
  // Optional size override (else GLYPH). Wide glyphs (e.g. the car) need a wider
  // box so they don't render short next to the square tokens.
  className?: string;
};

export function IconGlyph({ icon }: { icon: GameIcon }) {
  return (
    <svg
      viewBox={icon.viewBox}
      aria-hidden
      className={`${icon.className ?? GLYPH} ${SHADOW}`}
    >
      {(icon.paths ?? [icon.d ?? ""]).map((d, i) => (
        <path key={i} d={d} fill={CHARCOAL} fillRule={icon.fillRule} />
      ))}
    </svg>
  );
}

export default function IconDivider({
  icons,
  game,
}: {
  icons: GameIcon[];
  game?: Game;
}) {
  return (
    <DividerRow game={game}>
      {icons.map((ic) => (
        <IconGlyph key={ic.name} icon={ic} />
      ))}
    </DividerRow>
  );
}
