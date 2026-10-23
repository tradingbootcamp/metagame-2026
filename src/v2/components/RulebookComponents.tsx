import { NIGHT_NAME } from "@/v2/data/chapters";
import Glyph, { type GlyphName } from "./Glyph";
import { DISPLAY } from "./styles";

const COMPONENTS: {
  glyph: GlyphName;
  tile: string;
  title: string;
  body: string;
}[] = [
  {
    glyph: "talks",
    tile: "bg-sky text-navy",
    title: "Talks",
    body: "Main-room talks from game designers, puzzle makers and people who study play.",
  },
  {
    glyph: "workshops",
    tile: "bg-peach text-navy",
    title: "Workshops",
    body: "Build an escape room, construct a crossword, playtest a design.",
  },
  {
    glyph: "party-games",
    tile: "bg-moss text-cream",
    title: "Games",
    body: "Sessions run by attendees: tournaments, LARPs, social deduction, indie TTRPGs and more.",
  },
  {
    glyph: "megagame",
    tile: "bg-tan text-navy",
    title: "The Megagame",
    body: "A puzzle hunt, game gauntlet and story that runs all weekend. See §6.",
  },
  {
    glyph: "card-games",
    tile: "bg-navy text-cream",
    title: NIGHT_NAME,
    body: "Friday night's booths: games to play, things to try, makers to meet. See §6.",
  },
  {
    glyph: "trivia",
    tile: "bg-brand-blue text-navy",
    title: "Snacks & drinks",
    body: "Free for the taking, with food trucks on site for meals.",
  },
];

// §2 of the rulebook: what's in the box, one coloured card per component.
export default function RulebookComponents() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {COMPONENTS.map(({ glyph, tile, title, body }) => (
        <li
          key={title}
          className={`rulebook-rise group flex min-h-[170px] flex-col gap-2 rounded-[14px] p-5 transition-[translate,rotate,box-shadow] duration-300 hover:-translate-y-1.5 hover:-rotate-1 hover:shadow-[6px_6px_0_0_var(--color-navy)] ${tile}`}
          // The card-games glyph's front card matches its tile.
          style={{ "--glyph-bg": "var(--color-navy)" } as React.CSSProperties}
        >
          <Glyph
            name={glyph}
            className="size-11 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
          />
          <h3
            className={`${DISPLAY} mt-auto text-[28px] leading-none tracking-[0.02em]`}
          >
            {title}
          </h3>
          <p className="text-[14.5px] leading-[1.4]">{body}</p>
        </li>
      ))}
    </ul>
  );
}
