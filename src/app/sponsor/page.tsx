import type { Metadata } from "next";
import Link from "next/link";
import { FaArrowLeft, FaCheck, FaEnvelope } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { EYEBROW, HEADING } from "@/components/site/styles";

export const metadata: Metadata = {
  title: "Sponsor — Metagame 2026",
  description:
    "Sponsorship tiers for Metagame 2026 — Headline, Platinum, Gold, and Silver packages. Nov 6-8, 2026 at Lighthaven, Berkeley.",
};

const CONTACT = "team@metagame.games";

type TierId = "headline" | "platinum" | "gold" | "silver";

const TIERS: {
  id: TierId;
  name: string;
  cost: string;
  limit?: string;
  blurb: string;
  // Column header + tier card colors, per tier.
  head: string;
  cell: string;
}[] = [
  {
    id: "headline",
    name: "Headline",
    cost: "Let's talk",
    limit: "1 available",
    blurb:
      "Top billing everywhere, a hand in the creative direction, and the opening-session stage.",
    head: "bg-meeple text-white",
    cell: "bg-salmon/10",
  },
  {
    id: "platinum",
    name: "Platinum",
    cost: "$60k",
    limit: "3 available",
    blurb: "A premium session slot, custom swag, and a big block of tickets.",
    head: "bg-navy text-cream",
    cell: "bg-sky/35",
  },
  {
    id: "gold",
    name: "Gold",
    cost: "$30k",
    blurb: "A session slot and tickets for your team.",
    head: "bg-tan text-navy",
    cell: "bg-peach/35",
  },
  {
    id: "silver",
    name: "Silver",
    cost: "$15k",
    blurb: "Your logo on everything and a couple of tickets.",
    head: "bg-ink/70 text-cream",
    cell: "bg-ink/[0.04]",
  },
];

// true = plain check; string = check with a qualifier (or a count); false = not
// included. Mirrors the planning spreadsheet row-for-row.
type Cell = boolean | string;
const BENEFITS: { label: string; cells: Record<TierId, Cell> }[] = [
  {
    label: "Featured on marketing, posters & swag",
    cells: {
      headline: "Prominent",
      platinum: true,
      gold: true,
      silver: true,
    },
  },
  {
    label: "Session / talk slot",
    cells: { headline: true, platinum: true, gold: true, silver: false },
  },
  {
    label: "Premium session slot",
    cells: { headline: true, platinum: true, gold: false, silver: false },
  },
  {
    label: "Supply custom swag",
    cells: { headline: true, platinum: true, gold: false, silver: false },
  },
  {
    label: "Speak at the opening session",
    cells: { headline: true, platinum: false, gold: false, silver: false },
  },
  {
    label: "“Guest of Honor” tickets",
    cells: { headline: "5", platinum: "2", gold: "1", silver: false },
  },
  {
    label: "Standard tickets",
    cells: { headline: "5", platinum: "5", gold: "3", silver: "2" },
  },
  {
    label: "Attendee database access",
    cells: { headline: true, platinum: true, gold: true, silver: true },
  },
  {
    label: "Creative direction",
    cells: { headline: true, platinum: false, gold: false, silver: false },
  },
  {
    label: "Something else? Custom benefits",
    cells: {
      headline: true,
      platinum: true,
      gold: "Let's talk",
      silver: false,
    },
  },
];

// Numeric cells render as the bare count; everything else is check/dash.
function isCount(v: Cell): v is string {
  return typeof v === "string" && /^\d+$/.test(v);
}

function BenefitCell({ value }: { value: Cell }) {
  if (value === false) {
    return (
      <span aria-label="Not included" className="text-ink/30">
        &mdash;
      </span>
    );
  }
  if (isCount(value)) {
    return <span className="text-[17px] font-bold text-navy">{value}</span>;
  }
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <FaCheck aria-label="Included" className="text-meeple" size={14} />
      {typeof value === "string" && (
        <span className="text-xs leading-tight font-semibold text-ink/70">
          {value}
        </span>
      )}
    </span>
  );
}

const MAILTO = `mailto:${CONTACT}?subject=${encodeURIComponent(
  "Metagame 2026 sponsorship",
)}`;

export default function SponsorPage() {
  return (
    <main className="min-h-dvh bg-background px-[clamp(20px,5vw,56px)] py-[clamp(32px,6vh,72px)] font-[family-name:var(--font-inter)] leading-[1.55] text-ink">
      <div className="mx-auto max-w-[1080px]">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-[13px] tracking-[0.16em] text-ink/60 uppercase transition hover:text-ink"
        >
          <FaArrowLeft size={12} aria-hidden /> Back
        </Link>

        <header className="mt-6 max-w-[720px]">
          <p className={`${EYEBROW} mb-2.5 text-meeple`}>
            Want to be part of it?
          </p>
          <h1 className={`${HEADING} text-[clamp(32px,5vw,52px)] text-navy`}>
            Sponsor Metagame 2026
          </h1>
          <p className="mt-4 text-lg text-ink/75">
            Metagame is three days of talks, workshops, and games at Lighthaven
            in Berkeley, November 6&ndash;8, 2026. Sponsors put their name in
            front of a few hundred of the most curious, game-brained people we
            know &mdash; and get to be in the room with them.
          </p>
          <p className="mt-3 text-base text-ink/70">
            Four tiers below. Nothing here is set in stone &mdash; if you want
            something that isn&rsquo;t on the list, tell us.
          </p>
        </header>

        {/* Tier cards — the at-a-glance version of the table below. */}
        <section className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className="flex flex-col overflow-hidden rounded-xl border border-line bg-white"
            >
              <div className={`px-5 py-4 ${t.head}`}>
                <p className={`${HEADING} text-[30px]`}>{t.name}</p>
                <p className="mt-1 font-space-mono text-[15px] tracking-[0.12em] uppercase opacity-85">
                  {t.cost}
                </p>
                {t.limit && (
                  <p className="mt-1 text-xs font-semibold tracking-[0.06em] uppercase opacity-80">
                    {t.limit}
                  </p>
                )}
              </div>
              <p className="flex-1 px-5 py-4 text-[15px] text-ink/75">
                {t.blurb}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <p className={`${EYEBROW} mb-4 text-meeple`}>What&rsquo;s included</p>
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[640px] border-collapse text-center text-[15px]">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-[1] w-[220px] min-w-[160px] bg-[#f5f4f2] px-4 py-4 text-left font-space-mono text-[13px] tracking-[0.18em] text-ink/70 uppercase"
                  >
                    Benefit
                  </th>
                  {TIERS.map((t) => (
                    <th
                      key={t.id}
                      scope="col"
                      className={`px-3 py-4 ${t.head}`}
                    >
                      <span className={`${HEADING} block text-[22px]`}>
                        {t.name}
                      </span>
                      <span className="mt-1 block font-space-mono text-[13px] tracking-[0.12em] uppercase opacity-85">
                        {t.cost}
                      </span>
                      {t.limit && (
                        <span className="mt-0.5 block text-[11px] font-semibold tracking-[0.06em] uppercase opacity-75">
                          {t.limit}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BENEFITS.map((b) => (
                  <tr key={b.label} className="border-t border-line">
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] bg-white px-4 py-3.5 text-left font-semibold text-ink"
                    >
                      {b.label}
                    </th>
                    {TIERS.map((t) => (
                      <td key={t.id} className={`px-3 py-3.5 ${t.cell}`}>
                        <BenefitCell value={b.cells[t.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14 rounded-xl bg-navy px-6 py-8 text-cream sm:px-10">
          <h2 className={`${HEADING} text-[clamp(24px,3.5vw,32px)]`}>
            Interested?
          </h2>
          <p className="mt-3 max-w-[560px] text-base text-cream/80">
            Email us and we&rsquo;ll set up a call. Happy to mix and match
            benefits, talk about in-kind sponsorship, or hear an idea we
            haven&rsquo;t thought of.
          </p>
          <Button asChild size="lg" className="mt-6">
            <a href={MAILTO}>
              <FaEnvelope aria-hidden /> {CONTACT}
            </a>
          </Button>
        </section>
      </div>
    </main>
  );
}
