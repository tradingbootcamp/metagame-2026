// One place to size every divider icon. Chess + dice set the baseline: square
// glyphs (dice, chess, game-icons) render at GLYPH. The portrait solid cards
// (set, suits) are narrower, so they take a little more height to sit at the same
// optical size — CARD. Tune these two and every divider follows.
export const GLYPH = "h-[33px] w-[33px]";
// GLYPH and the gap between icons, as numbers, for rows that do geometry.
export const GLYPH_PX = 33;
export const ICON_GAP = "gap-[34px]";
export const ICON_GAP_PX = 34;
// Card width is pinned per row, rounded up from that row's viewBox ratio: left
// to `w-auto` the box is a fraction of a pixel wide and a relayout re-snaps the
// whole centred row sideways.
export const CARD = "h-[37px]";
export const CARD_SET = `${CARD} w-[24px]`; // 56:88 → 23.5px
export const CARD_SUITS = `${CARD} w-[27px]`; // 260:360 → 26.7px
export const SHADOW = "drop-shadow-[0_1px_2px_rgba(27,27,27,0.12)]";
// Anything that animates gets its own compositing layer up front. A glyph whose
// ink spills past its box (a rotation, a glow) moves the bounds of the layer it
// shares with its neighbours, and a layer whose origin re-snaps drags
// everything it paints a pixel sideways.
export const LAYER = "transform-gpu will-change-transform";
