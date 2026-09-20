// One place to size every divider icon. Chess + dice set the baseline: square
// glyphs (dice, chess, game-icons) render at GLYPH. The portrait solid cards
// (set, suits) are narrower, so they take a little more height to sit at the same
// optical size — CARD. Tune these two and every divider follows.
export const GLYPH = "h-[33px] w-[33px]";
// GLYPH and the gap between icons, as numbers, for rows that do geometry.
export const GLYPH_PX = 33;
export const ICON_GAP = "gap-[34px]";
export const ICON_GAP_PX = 34;
export const CARD = "h-[37px] w-auto";
export const SHADOW = "drop-shadow-[0_1px_2px_rgba(27,27,27,0.12)]";
