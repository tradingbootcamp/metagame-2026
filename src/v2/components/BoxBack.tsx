import Glyph, { GLYPH_LABELS, type GlyphName } from "./Glyph";
import ShelfFigure from "./ShelfFigure";
import { DISPLAY, TOKEN } from "./styles";

// The box back's stats, as printed on a game box. Same facts as the FAQ.
const STATS = [
  { label: "Players", value: "Everyone who shows up" },
  { label: "Play time", value: "Fri 2 pm – Sun 9 pm" },
  { label: "Ages", value: "All · under 13 free" },
  { label: "Board", value: "Lighthaven, Berkeley" },
];

// Token colours from the brand guide. The cream ones get a navy edge so they
// show on the page.
const CONTENTS: { name: GlyphName; bg: string; fg: string }[] = [
  { name: "puzzles", bg: "bg-navy", fg: "text-cream" },
  { name: "video-games", bg: "bg-brand-blue", fg: "text-navy" },
  { name: "larps", bg: "bg-meeple", fg: "text-cream" },
  { name: "talks", bg: "bg-sky", fg: "text-navy" },
  { name: "megagame", bg: "bg-tan", fg: "text-navy" },
  { name: "party-games", bg: "bg-moss", fg: "text-cream" },
  { name: "card-games", bg: "bg-peach", fg: "text-navy" },
  { name: "crosswords", bg: "bg-sky", fg: "text-navy" },
  { name: "workshops", bg: "bg-tan", fg: "text-navy" },
  { name: "escape-rooms", bg: "bg-background", fg: "text-navy" },
  { name: "trivia", bg: "bg-brand-blue", fg: "text-navy" },
  { name: "board-games", bg: "bg-background", fg: "text-navy" },
];
// Each token in the pile sits a little askew.
const TILT = [
  "-rotate-6",
  "rotate-3",
  "-rotate-2",
  "rotate-6",
  "-rotate-3",
  "rotate-2",
];

// The back of the box beside the cover, laid straight on the page: the game
// library photo (the cover puzzle), the weekend's stats, and the contents as
// a pile of tokens, one per kind of play.
export default function BoxBack() {
  return (
    <aside aria-label="At a glance">
      <ShelfFigure />
      <dl className="mt-5 grid grid-cols-2 gap-x-6 border-t-2 border-navy">
        {STATS.map(({ label, value }) => (
          <div key={label} className="border-b border-navy/15 py-3">
            <dt className="font-space-mono text-[10.5px] font-bold tracking-[0.14em] text-meeple uppercase">
              {label}
            </dt>
            <dd
              className={`${DISPLAY} mt-1 text-[22px] leading-[1.05] tracking-[0.02em] text-navy sm:text-[26px]`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-5 mb-3 font-space-mono text-xs font-bold tracking-[0.14em] text-navy uppercase">
        Contents
      </h3>
      {/* The tokens deal in one by one on load and overlap like chips in a
          pile; hovering one lifts it out and names it. */}
      <ul className="flex flex-wrap gap-y-2 pl-2">
        {CONTENTS.map(({ name, bg, fg }, i) => (
          <li
            key={name}
            className={`rulebook-deal group relative -ml-2 ${TOKEN} size-11 text-[25px] ring-[3px] ring-background transition-[translate,rotate] duration-200 hover:z-10 hover:-translate-y-1.5 hover:rotate-0 ${TILT[i % TILT.length]} ${bg} ${fg} ${
              bg === "bg-background" ? "border-2 border-navy" : ""
            }`}
            // The card-games glyph's front card matches its token.
            style={
              {
                "--glyph-bg": "var(--color-peach)",
                animationDelay: `${300 + i * 60}ms`,
              } as React.CSSProperties
            }
          >
            <Glyph name={name} label={GLYPH_LABELS[name]} />
            <span
              aria-hidden
              className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-navy px-2 py-1 font-space-mono text-[10px] font-bold tracking-[0.1em] whitespace-nowrap text-cream uppercase opacity-0 transition-opacity group-hover:opacity-100"
            >
              {GLYPH_LABELS[name]}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
