import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LastYearViews from "@/v2/components/last-year/LastYearViews";
import { DISPLAY } from "@/v2/components/styles";
import { Button } from "@/v2/components/ui/button";
import { LAST_YEAR_SITE_URL } from "@/v2/lib/links";
import megagameMap from "../../../../public/images/last-year/megagame-map-2025.jpg";

export const metadata: Metadata = {
  title: "Last year — Metagame 2026",
  description:
    "What was on at Metagame 2025: step through the weekend moment by moment, or browse the full schedule.",
};

const PAGE = "mx-auto w-full max-w-[1192px] px-4 sm:px-8";

// Last year's program: a short blurb, then the weekend at any moment (with
// the full schedule grid a toggle away), and a link back to 2026.
export default function LastYearPage() {
  return (
    <div className={`${PAGE} pt-24 pb-20 lg:pt-28`}>
      <header>
        <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
          What happened last year?
        </p>
        <h1
          className={`${DISPLAY} mt-3.5 text-[clamp(56px,8vw,112px)] leading-[0.86] text-navy`}
        >
          Metagame 2025<span className="text-meeple">.</span>
        </h1>
        <div className="mt-5 max-w-[40em]">
          <p className="text-lg leading-relaxed text-ink/80 sm:text-xl">
            Three days of talks, games, workshops and a multi-faction Megagame
            fighting over territory at Lighthaven.
          </p>
          <a
            href={LAST_YEAR_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block font-space-mono text-sm font-bold tracking-[0.08em] text-navy uppercase underline decoration-2 underline-offset-4 hover:text-meeple"
          >
            Full 2025 site <span aria-hidden="true">&#8599;</span>
          </a>
        </div>
      </header>

      <div className="mt-10 border-t-2 border-navy pt-8">
        <LastYearViews />
      </div>

      <figure className="mx-auto mt-12 w-full max-w-[320px]">
        <Image
          src={megagameMap}
          alt="Aerial map of Lighthaven with each Megagame territory shaded orange or purple by the faction holding it"
          sizes="320px"
          className="h-auto w-full mix-blend-multiply"
        />
        <figcaption className="mt-3 text-sm text-ink/70 italic">
          End state of the Metagame 2025 Megagame territory map
        </figcaption>
      </figure>

      <div className="mt-16 flex flex-wrap gap-3 border-t-2 border-navy pt-10">
        <Button asChild>
          <Link href="/">Back to Metagame 2026</Link>
        </Button>
      </div>
    </div>
  );
}
