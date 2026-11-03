import { dayPasses } from "@/v2/lib/tickets";
import AtAGlance from "./AtAGlance";
import { DISPLAY, KICKER } from "./styles";
import { Button } from "./ui/button";

const KICKER_TEXT = "Nov 6–8, 2026 · Lighthaven, Berkeley";
const HEADLINE_LINE_1 = "Every kind";
const HEADLINE_LINE_2 = "of play";
const PITCH =
  "A weekend conference devoted to games, and to the people who make, study and play them. Three days at Lighthaven, with a Megagame running through all of it.";
const CTA_TICKETS = "Get tickets · from";
const CTA_LEARN_MORE = "Learn more ↓";

const FROM_USD = Math.min(...dayPasses.map((p) => p.usd));

const PAGE = "mx-auto w-full max-w-[1180px] px-4 sm:px-8";

export default function HomeHero() {
  return (
    <div
      className={`${PAGE} grid items-center gap-10 pt-6 pb-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12 lg:pt-8`}
    >
      <div>
        <p className={`${KICKER} text-[13px] text-meeple`}>{KICKER_TEXT}</p>
        <h1
          className={`${DISPLAY} mt-3.5 text-[clamp(64px,11vw,150px)] leading-[0.84] text-navy`}
        >
          {HEADLINE_LINE_1}
          <br />
          {HEADLINE_LINE_2}
          <span className="text-meeple">.</span>
        </h1>
        <p className="mt-5 max-w-[34em] text-lg leading-relaxed text-ink/80 sm:text-xl">
          {PITCH}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild>
            <a href="#tickets">
              {CTA_TICKETS} ${FROM_USD}
            </a>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="border-2 border-navy text-navy hover:border-navy hover:bg-navy/5"
          >
            <a href="#about">{CTA_LEARN_MORE}</a>
          </Button>
        </div>
      </div>
      <AtAGlance />
    </div>
  );
}
