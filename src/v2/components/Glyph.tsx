// The brand guide's twelve "kinds of play" icons (branding/assets/glyphs):
// 48px line drawings in currentColor. The card-games front card fills with
// --glyph-bg so it hides the card behind it on any tile colour.
const PATHS = {
  "board-games": (
    <>
      <rect x="9" y="9" width="30" height="30" rx="6" />
      <circle cx="17" cy="17" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="24" cy="24" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="31" cy="31" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  puzzles: (
    <path d="M9 15 H19 a5 5 0 1 1 10 0 H37 V24 a5 5 0 1 1 0 10 V41 H9 Z" />
  ),
  "video-games": (
    <>
      <path d="M15 15 h18 a8 8 0 0 1 8 7 l2 10 a5 5 0 0 1 -9 3.5 L30 31 H18 l-4 4.5 a5 5 0 0 1 -9 -3.5 l2 -10 a8 8 0 0 1 8 -7 z" />
      <path d="M15 20 v8 M11 24 h8" />
      <circle cx="32" cy="21.5" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="36" cy="26" r="1.9" fill="currentColor" stroke="none" />
    </>
  ),
  "card-games": (
    <>
      <rect
        x="17"
        y="8"
        width="21"
        height="30"
        rx="3"
        transform="rotate(12 27 23)"
      />
      <rect
        x="10"
        y="10"
        width="21"
        height="30"
        rx="3"
        fill="var(--glyph-bg, #fffbf2)"
      />
      <path d="M20.5 18 l5 7 -5 7 -5 -7 z" fill="currentColor" stroke="none" />
    </>
  ),
  crosswords: (
    <>
      <rect x="8" y="8" width="32" height="32" rx="2" />
      <path d="M18.7 8 V40 M29.3 8 V40 M8 18.7 H40 M8 29.3 H40" />
      <rect
        x="8"
        y="8"
        width="10.7"
        height="10.7"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="29.3"
        y="29.3"
        width="10.7"
        height="10.7"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  larps: (
    <>
      <path d="M9 13 c9 4 21 4 30 0 v11 c0 10 -8 16 -15 16 s-15 -6 -15 -16 z" />
      <path d="M15 22 q3 -3 6 0 M27 22 q3 -3 6 0 M19 31 q5 4 10 0" />
    </>
  ),
  talks: (
    <>
      <rect x="18" y="6" width="12" height="21" rx="6" />
      <path d="M12 22 a12 12 0 0 0 24 0 M24 34 v7 M17 41 h14" />
    </>
  ),
  workshops: (
    <path d="M11 37 l3 -10 L31 10 l7 7 L21 34 z M27 14 l7 7 M11 37 l10 -3" />
  ),
  "escape-rooms": (
    <>
      <circle cx="15" cy="24" r="7" />
      <path d="M22 24 H41 M35 24 v6 M40 24 v5" />
    </>
  ),
  megagame: (
    <>
      <circle cx="20" cy="20" r="11" />
      <path d="M28 28 L40 40" />
      <path d="M15 20 h10 M20 15 v10" />
    </>
  ),
  "party-games": (
    <>
      <path d="M7 11 h22 a3 3 0 0 1 3 3 v11 a3 3 0 0 1 -3 3 H17 l-7 6 v-6 H7 a3 3 0 0 1 -3 -3 V14 a3 3 0 0 1 3 -3 z" />
      <path d="M32 18 h9 a3 3 0 0 1 3 3 v10 a3 3 0 0 1 -3 3 h-2 v6 l-7 -6 h-8 a3 3 0 0 1 -3 -3" />
    </>
  ),
  trivia: (
    <>
      <circle cx="24" cy="24" r="17" />
      <path d="M18.5 19 a5.5 5.5 0 1 1 8 5 c-2 1 -2.5 2.2 -2.5 4.5" />
      <circle cx="24" cy="34" r="2" fill="currentColor" stroke="none" />
    </>
  ),
};

export type GlyphName = keyof typeof PATHS;

export const GLYPH_LABELS: Record<GlyphName, string> = {
  "board-games": "Board games",
  puzzles: "Puzzles",
  "video-games": "Video games",
  "card-games": "Card games",
  crosswords: "Crosswords",
  larps: "LARPs",
  talks: "Talks",
  workshops: "Workshops",
  "escape-rooms": "Escape rooms",
  megagame: "The Megagame",
  "party-games": "Party games",
  trivia: "Trivia",
};

export default function Glyph({
  name,
  label,
  className = "size-[1em]",
}: {
  name: GlyphName;
  /** Accessible name; omit for a decorative icon. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      {PATHS[name]}
    </svg>
  );
}
