import type { Metadata } from "next";
import Image from "next/image";
import ContentPage from "@/v2/components/ContentPage";
import LastYearSchedule from "@/v2/components/schedule/LastYearSchedule";
import { HEADING } from "@/v2/components/styles";
import { Button } from "@/v2/components/ui/button";
import { LAST_YEAR_SITE_URL } from "@/v2/lib/links";
import megachess from "../../../../public/images/megachess.jpg";

export const metadata: Metadata = {
  title: "Last year — Metagame 2026",
  description:
    "What happened at Metagame 2025: the con, the schedule, and the archive.",
};

export default function LastYearPage() {
  return (
    <ContentPage
      eyebrow="What happened last year?"
      title="Metagame 2025"
      intro={
        <p>
          Metagame 2025 ran for three days at Lighthaven. The whole con was one
          large megagame: players were split onto the purple and orange teams,
          solved puzzles hidden in and on their swag to unlock team
          headquarters, then spent the weekend competing in various subgames and
          sidequests to battle for territory across campus and level-up their
          personal player stats. Meanwhile, other attendees learned how to
          construct crosswords, built an escape room from scratch, solved human
          sudokus, and played every flavor of LARP under the sun.
        </p>
      }
      wide
    >
      <Image
        src={megachess}
        alt="Giant purple and orange chess pieces mid-game on the Lighthaven lawn, with a laptop scoreboard reading 'Purple to move'"
        className="mb-14 h-auto w-full max-w-[820px] rounded-2xl border border-navy/10 shadow-[0_8px_24px_rgba(23,48,89,0.08)]"
        sizes="(min-width: 1024px) 820px, 100vw"
      />

      <h2 className={`${HEADING} mb-3 text-[clamp(24px,3vw,34px)] text-navy`}>
        The 2025 schedule
      </h2>
      <p className="mb-8 max-w-[640px] text-base text-ink/70">
        The complete program: talks, workshops, games, and megagames across
        three days. Tap any session for details.
      </p>
      <LastYearSchedule />

      <div className="mt-16 border-t border-line pt-10">
        <Button asChild variant="navy">
          <a
            href={LAST_YEAR_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            2025.metagame.games <span aria-hidden="true">&#8599;</span>
          </a>
        </Button>
      </div>
    </ContentPage>
  );
}
