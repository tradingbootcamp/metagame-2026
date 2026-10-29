import { HATS } from "@/v2/hat-trick/hats";
import type { ClockSession } from "@/v2/lib/schedule-clock";
import crossword from "../../../public/images/carousel/4_crossword.jpg";
import roundRobin from "../../../public/images/misc_photos/board_game_round_robin_2.jpg";
import ExamplesOfPlay from "./ExamplesOfPlay";
import RulebookFigure from "./RulebookFigure";
import ScheduleClock from "./ScheduleClock";

// The photo column is this wide on a laptop; sizes keeps the downloads to it.
const FIG_SIZES = "(min-width: 1024px) 304px, (min-width: 640px) 50vw, 100vw";

// §1 of the rulebook as one spread: rule one, then the 2026 weekend on a
// clock, then the examples of play (a dealt hand of 2026 sessions), beside a
// column of two 2025 photos. Fig. 1 hides three Hat Trick hats, Fig. 2 the
// wizard's.
export default function RulebookObject({
  sessions,
}: {
  sessions: ClockSession[];
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-11">
      <div className="flex flex-col gap-10">
        <p className="max-w-[30em] text-[clamp(19px,2vw,23px)] leading-[1.4] text-navy">
          Rule one: if it&apos;s designed to be played, it counts. If building
          it means asking &ldquo;what would the player choose to do
          next?&rdquo;, it&apos;s a game.
        </p>
        <ScheduleClock sessions={sessions} />
        <ExamplesOfPlay />
      </div>
      <div className="grid content-start gap-5 sm:grid-cols-2 lg:grid-cols-1">
        <RulebookFigure
          fig="1"
          caption="Players solving the wall crossword. Metagame 2025."
          src={crossword}
          alt="A group solving a crossword written on a wall"
          hats={[HATS.skyCap, HATS.navyCap, HATS.redHat]}
          sizes={FIG_SIZES}
        />
        <RulebookFigure
          fig="2"
          caption="The board game round robin at Metagame 2025."
          src={roundRobin}
          alt="A crowd leaning over a long table of abstract games during the board game round robin"
          hats={[HATS.wizard]}
          sizes={FIG_SIZES}
        />
      </div>
    </div>
  );
}
