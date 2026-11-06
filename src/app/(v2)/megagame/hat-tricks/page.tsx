import type { Metadata } from "next";
import ContentPage from "@/v2/components/ContentPage";
import { HEADING } from "@/v2/components/styles";

// A holding page until the Hat Tricks page itself lands. The six hats are the
// real ones, so anyone who finds this knows what to look for before the game
// opens; the art is the same line art the full page uses.

export const metadata: Metadata = {
  title: "Hat Tricks — Metagame 2026",
  description: "A hat trick is when you trick someone and take their hat.",
};

const HATS = [
  { id: "wizard", name: "Wizard hat" },
  { id: "saucer", name: "Alien saucer" },
  { id: "fuzzy", name: "Sparkly fuzzy hat" },
  { id: "slouch", name: "Satin slouch hat" },
  { id: "tricorn", name: "Tricorn" },
  { id: "crown", name: "Spiked crown" },
];

export default function HatTricksPage() {
  return (
    <ContentPage
      title="Hat Tricks"
      intro="A hat trick is when you trick someone and take their hat."
    >
      <div className="rounded-lg border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static line art, decorative */}
          <img
            src="/images/hat-tricks/stack.svg"
            alt=""
            className="h-32 w-auto sm:h-40"
          />
          <h2 className={`${HEADING} text-[clamp(24px,3vw,34px)] text-navy`}>
            Hats are not yet stealable
          </h2>
          <p className="max-w-[46ch] text-base text-ink/70 md:text-lg">
            Come back for Hat Tricks later today.
          </p>
        </div>
      </div>

      <section className="mt-14">
        <h2
          className={`${HEADING} mb-2 text-[clamp(22px,2.5vw,28px)] text-navy`}
        >
          The six hats
        </h2>
        <p className="mb-6 text-base text-ink/70">
          Learn them now. You&rsquo;ll want to recognise one across a crowded
          room.
        </p>
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {HATS.map((hat) => (
            <li
              key={hat.id}
              className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white p-5 text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static line art, no layout shift to fix */}
              <img
                src={`/images/hat-tricks/${hat.id}.svg`}
                alt=""
                className="size-20 sm:size-24"
              />
              <h3 className={`${HEADING} text-[18px] text-navy`}>{hat.name}</h3>
            </li>
          ))}
        </ul>
      </section>
    </ContentPage>
  );
}
