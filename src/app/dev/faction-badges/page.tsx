import { notFound } from "next/navigation";
import { FACTION_NAMES, MEGAGAME_CLASSES } from "@/lib/megagame-levels";
import PersonCard from "@/v2/components/PersonCard";
import FactionBadge from "@/v2/components/megagame/FactionBadge";
import type { Person } from "@/v2/data/team";

export const metadata = { title: "Faction badges", robots: { index: false } };

// Stand-ins, not real speakers: a real card shows a badge only once that
// speaker has told us their faction (`factions` in src/v2/data/speakers.ts).
const SAMPLES: Person[] = [
  { name: "Sample Speaker", title: "Wizard College", factions: ["wizard"] },
  { name: "Second Sample", title: "Pirate Crew", factions: ["pirate"] },
  { name: "Third Sample", title: "Alien Fleet", factions: ["alien"] },
  {
    name: "Multi Classer",
    title: "Two factions",
    factions: ["pirate", "alien"],
  },
  { name: "Not Chosen", title: "No pick yet" },
];

// The home page's speaker grid widths, so the cards here match it.
const CELL =
  "w-[calc(33.333%-0.3334rem)] sm:w-[calc(33.333%-0.8334rem)] lg:w-[calc(25%-0.9375rem)]";

// Dev-only preview of the Megagame faction badges: each at a poster size and
// at the sizes a speaker card uses, then on sample speaker cards. 404s in
// production builds.
export default function FactionBadgesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-dvh bg-background px-4 py-12 font-[family-name:var(--font-inter)] text-ink">
      <div className="mx-auto max-w-[1080px]">
        <p className="font-space-mono text-xs font-bold tracking-[0.16em] text-meeple uppercase">
          Megagame · Speakers
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-bebas)] text-6xl leading-none text-navy">
          Faction badges
        </h1>

        <ul className="mt-10 flex flex-wrap gap-x-12 gap-y-8">
          {MEGAGAME_CLASSES.map((c) => (
            <li key={c} className="flex flex-col items-center gap-3">
              <div className="flex items-end gap-4">
                <FactionBadge faction={c} className="size-40" />
                <FactionBadge faction={c} className="size-11" />
                <FactionBadge faction={c} className="size-8" />
              </div>
              <span className="font-space-mono text-xs font-bold tracking-[0.12em] text-ink/70 uppercase">
                {FACTION_NAMES[c]}
              </span>
            </li>
          ))}
        </ul>

        <h2 className="mt-14 font-[family-name:var(--font-bebas)] text-4xl leading-none text-navy">
          On speaker cards
        </h2>
        <div className="mt-6 flex flex-wrap gap-2 sm:gap-5">
          {SAMPLES.map((p) => (
            <div key={p.name} className={CELL}>
              <PersonCard {...p} compact />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
