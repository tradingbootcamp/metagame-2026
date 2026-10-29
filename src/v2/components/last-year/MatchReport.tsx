import { HATS } from "@/v2/hat-trick/hats";
import megachess from "../../../../public/images/megachess.jpg";
import Glyph, { type GlyphName } from "../Glyph";
import RulebookFigure from "../RulebookFigure";
import { DISPLAY, TOKEN } from "../styles";

// The 2025 megagame in four turns, numbered in the two teams' colours.
const TURNS = [
  {
    title: "Pick a side",
    body: "Players were split onto the purple and orange teams.",
  },
  {
    title: "Open the box",
    body: "Teams solved puzzles hidden in and on their swag to unlock their headquarters.",
  },
  {
    title: "Take the campus",
    body: "All weekend, the teams battled for territory across campus in subgames and sidequests.",
  },
  {
    title: "Level up",
    body: "Along the way, players leveled up their personal player stats.",
  },
];
const TEAM_BG = ["#cbb6ec", "#eaa35a"];

const SIDE_QUESTS: { glyph: GlyphName; text: string }[] = [
  { glyph: "crosswords", text: "Learned how to construct crosswords" },
  { glyph: "escape-rooms", text: "Built an escape room from scratch" },
  { glyph: "puzzles", text: "Solved human sudokus" },
  { glyph: "larps", text: "Played every flavor of LARP under the sun" },
];

// §1 of the 2025 edition: how the con played, beside the megachess photo
// (which keeps its Hat Trick bishop), and what everyone else got up to.
export default function MatchReport() {
  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <RulebookFigure
          fig="1"
          caption="Megachess on the Lighthaven lawn. Purple to move."
          src={megachess}
          alt="Giant purple and orange chess pieces mid-game on the Lighthaven lawn, with a laptop scoreboard reading 'Purple to move'"
          hats={[HATS.bishop]}
        />
        <div>
          <p className="text-lg leading-relaxed text-ink/80 sm:text-xl">
            Metagame 2025 ran for three days at Lighthaven, and the whole con
            was one large megagame.
          </p>
          <ol className="mt-6 border-t-2 border-navy">
            {TURNS.map((turn, i) => (
              <li
                key={turn.title}
                className="rulebook-rise flex items-start gap-4 border-b border-navy/15 py-4"
              >
                <span
                  aria-hidden
                  className={`${DISPLAY} ${TOKEN} size-11 border-2 border-navy text-[26px] leading-none text-navy`}
                  style={{ background: TEAM_BG[i % 2] }}
                >
                  {i + 1}
                </span>
                <div>
                  <h3
                    className={`${DISPLAY} text-[28px] leading-none tracking-[0.02em] text-navy`}
                  >
                    {turn.title}
                  </h3>
                  <p className="mt-1 text-[15px] leading-snug text-ink/75">
                    {turn.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <h3 className="mt-12 font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
        Meanwhile, on the side
      </h3>
      <ul className="mt-3 grid gap-x-8 gap-y-5 border-t-2 border-navy pt-5 sm:grid-cols-2 lg:grid-cols-4">
        {SIDE_QUESTS.map((q) => (
          <li
            key={q.glyph}
            className="rulebook-rise flex items-center gap-3 text-navy"
          >
            <span className={`${TOKEN} size-12 bg-sky text-[28px]`}>
              <Glyph name={q.glyph} />
            </span>
            <span className="text-[15px] leading-snug font-semibold">
              {q.text}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
