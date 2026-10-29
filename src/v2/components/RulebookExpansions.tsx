import type { CSSProperties } from "react";
import { Rubik_Mono_One, Silkscreen } from "next/font/google";
import { NIGHT_NAME } from "@/v2/data/chapters";
import { HATS } from "@/v2/hat-trick/hats";
import {
  MEGAGAME_PROPOSAL_FORM_URL,
  NIGHT_MARKET_FORM_URL,
  NIGHT_PARTIFUL_URL,
} from "@/v2/lib/links";
import election from "../../../public/images/carousel/2_election.jpg";
import nightMarketCooks from "../../../public/images/email/night_market_cooks.jpg";
import { PAGE } from "./ChapterHeading";
import Glyph from "./Glyph";
import RulebookFigure from "./RulebookFigure";
import { DISPLAY, SECTION_ANCHOR, TOKEN } from "./styles";

// The night look's two faces, loaded only for this chapter.
const nightDisplay = Rubik_Mono_One({ weight: "400", subsets: ["latin"] });
const pixel = Silkscreen({ weight: "400", subsets: ["latin"] });

const GLOW = ["#ff8a3d", "#4d9ff7", "#59e3b0", "#ff5fa2"];
const BOOTHS = [
  "Games and puzzles",
  "Experiences",
  "Other physical stuff",
  "Job market",
  "Information booth",
  "Black market (legal)",
];
const EXT = { target: "_blank", rel: "noopener noreferrer" } as const;

// §5 of the rulebook. The Friday-night event turns the page to night: a band
// the width of the screen in the brand's night look (its name's last word as
// glowing letter tiles). Then the Megagame, back on the page as a side quest.
// Fig. 5.2 hides the Hat Trick's Crown.
export default function RulebookExpansions() {
  const words = NIGHT_NAME.split(" ");
  const tiles = words.pop() ?? "";
  return (
    <>
      <div
        id="night-market"
        className={`${SECTION_ANCHOR} group relative left-1/2 w-screen -translate-x-1/2 bg-[radial-gradient(90%_120%_at_30%_30%,#1a2152_0%,#0f1430_70%)] text-[#fff5e6]`}
      >
        <div
          className={`${PAGE} grid gap-10 py-12 sm:py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-14`}
        >
          <div>
            <p
              className={`${pixel.className} text-sm tracking-[0.1em] text-[#59e3b0] uppercase`}
            >
              Expansion pack · free · open to all
            </p>
            <h3
              className={`${nightDisplay.className} mt-3.5 text-[clamp(26px,3.4vw,38px)] leading-none uppercase`}
            >
              {words.join(" ")}
            </h3>
            <div
              className="mt-3 flex flex-wrap gap-1.5 sm:gap-2"
              aria-label={tiles}
              // On phones each tile gets an equal share of the page column, so
              // the word stays one line.
              style={
                {
                  "--tile-w": `clamp(30px, calc((100vw - 32px - ${(tiles.length - 1) * 6}px) / ${tiles.length}), 44px)`,
                } as CSSProperties
              }
            >
              {[...tiles.toUpperCase()].map((letter, i) => (
                <span
                  key={i}
                  aria-hidden
                  // One letter of the sign flickers now and then; hovering the
                  // band turns the whole sign up.
                  className={`${nightDisplay.className} grid h-[52px] w-(--tile-w) place-items-center rounded-[10px] border-[3px] bg-[#1b2350] text-[clamp(20px,7vw,26px)] leading-none transition-[filter] duration-300 group-hover:brightness-125 group-hover:saturate-150 sm:h-[68px] sm:w-[58px] sm:text-[34px] ${i === 2 ? "neon-flicker" : ""}`}
                  style={{
                    borderColor: GLOW[i % GLOW.length],
                    boxShadow: `inset 0 -5px 0 #2a3470, 0 0 26px color-mix(in srgb, ${GLOW[i % GLOW.length]} 40%, transparent)`,
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="mt-5 max-w-[34em]">
              Friday, Nov 6, 7–10 pm. The night the whole weekend opens its
              doors: booths of things to play, experience and savor, and the
              people who made them. Free and open to the public.
            </p>
            <ul className="mt-4 grid max-w-[34em] gap-x-4 gap-y-1.5 text-[14.5px] sm:grid-cols-2">
              {BOOTHS.map((b) => (
                <li key={b}>
                  <span
                    aria-hidden
                    className={`${pixel.className} text-[11px] text-[#ff8a3d]`}
                  >
                    ►{" "}
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={NIGHT_PARTIFUL_URL}
                {...EXT}
                className="inline-flex items-center rounded-lg bg-[#ff8a3d] px-[18px] py-[11px] text-sm font-bold text-[#0f1430] transition-transform hover:-translate-y-px"
              >
                RSVP on Partiful
              </a>
              <a
                href={NIGHT_MARKET_FORM_URL}
                {...EXT}
                className="inline-flex items-center rounded-lg border-2 border-[#fff5e6]/60 px-4 py-[9px] text-sm font-bold transition-colors hover:border-[#fff5e6]"
              >
                Apply for a booth
              </a>
            </div>
          </div>
          <RulebookFigure
            fig="5.1"
            caption="“Too Many Cooks” at the 2025 Night Market."
            src={nightMarketCooks}
            alt="“Too Many Cooks” at the Night Market"
            tone="night"
            sizes="(min-width: 1024px) 520px, 100vw"
          />
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
        <div className="flex flex-col items-start gap-3 text-navy">
          <span className={`${TOKEN} size-16 bg-tan`}>
            <Glyph name="megagame" className="size-10" />
          </span>
          <p className="mt-1 font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
            Side quest · runs all weekend
          </p>
          <h3
            className={`${DISPLAY} text-[clamp(44px,5vw,60px)] leading-[0.9]`}
          >
            The Megagame
          </h3>
          <p className="max-w-[34em] text-ink/80">
            The game begins when you step through the gate, and runs all
            weekend. One part puzzle hunt, one part game gauntlet, one part
            interlocking story, threaded through everything else. Anyone can
            play it, and anyone can help build it.
          </p>
          <a
            href={MEGAGAME_PROPOSAL_FORM_URL}
            {...EXT}
            className="mt-2 inline-flex items-center rounded-lg bg-navy px-[18px] py-[11px] text-sm font-bold text-cream transition-transform hover:-translate-y-px"
          >
            Build part of the Megagame
          </a>
        </div>
        <RulebookFigure
          fig="5.2"
          caption="The election game at Metagame 2025."
          src={election}
          alt="The election game at Metagame 2025"
          hats={[HATS.crown]}
          sizes="(min-width: 1024px) 520px, 100vw"
        />
      </div>
    </>
  );
}
