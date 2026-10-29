import { dayPasses } from "@/v2/lib/tickets";
import BoxBack from "./BoxBack";
import Dice from "./dice/Dice";
import { PAGE } from "./ChapterHeading";
import { DISPLAY, SECTION_ANCHOR } from "./styles";
import { Button } from "./ui/button";

const FROM_USD = Math.min(...dayPasses.map((p) => p.usd));

// The home page's hero, as the front of the game box: the METAGAME dice
// rolling in as the logo, then the title, the dates, a one-paragraph pitch and
// the CTAs, with the box back beside it.
export default function RulebookCover() {
  return (
    <section id="home" className={SECTION_ANCHOR}>
      <div className="pt-6 md:pt-8">
        <Dice
          size={0.8}
          stage="h-[clamp(110px,15vh,150px)] md:h-[clamp(190px,24vh,240px)]"
        />
      </div>
      <div
        className={`${PAGE} grid items-center gap-10 pt-6 pb-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12 lg:pt-8`}
      >
        <div>
          <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
            The rulebook · 2026 edition
          </p>
          <h1
            className={`${DISPLAY} mt-3.5 text-[clamp(76px,11vw,150px)] leading-[0.84] text-navy`}
          >
            Every kind
            <br />
            of play<span className="text-meeple">.</span>
          </h1>
          <p className="mt-5 font-space-mono text-sm font-bold tracking-[0.12em] text-navy uppercase">
            Nov 6–8, 2026 · Lighthaven, Berkeley
          </p>
          <p className="mt-3 max-w-[34em] text-lg leading-relaxed text-ink/80 sm:text-xl">
            A weekend conference devoted to games, and to the people who make,
            study and play them. Three days at Lighthaven, with a Megagame
            running through all of it.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <a href="#tickets">Get tickets · from ${FROM_USD}</a>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="border-2 border-navy text-navy hover:border-navy hover:bg-navy/5"
            >
              <a href="#about">How to play ↓</a>
            </Button>
          </div>
        </div>
        <BoxBack />
      </div>
    </section>
  );
}
