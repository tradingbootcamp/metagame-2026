import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/v2/components/ContentPage";
import { HEADING } from "@/v2/components/styles";
import { FaArrowDown, FaCheck, FaExternalLinkAlt } from "react-icons/fa";
import { Button } from "@/v2/components/ui/button";
import { MANIFUND_URL, SPONSOR_FORM_URL } from "@/v2/lib/links";

export const metadata: Metadata = {
  title: "Sponsor — Metagame 2026",
  description: "Sponsorship tiers for Metagame 2026.",
};

type TierId = "headline" | "platinum" | "gold" | "silver" | "patron";

const TIERS: {
  id: TierId;
  name: string;
  cost: string;
  limit?: string;
  blurb: string;
  head: string;
  cell: string;
  mark: string;
}[] = [
  {
    id: "headline",
    name: "Headline",
    cost: "Let's talk",
    limit: "1 available",
    blurb:
      "All the lower tiers' benefits, plus top billing as our \u201cBrought to you by\u201d sponsor and a hand in the creative direction.",
    head: "bg-meeple text-white",
    cell: "bg-meeple/10",
    mark: "text-meeple",
  },
  {
    id: "platinum",
    name: "Platinum",
    cost: "$60k",
    limit: "3 available",
    blurb:
      "All the lower tiers' benefits, plus a premium branded session, custom swag, and more tickets.",
    head: "bg-navy text-cream",
    cell: "bg-sky/35",
    mark: "text-brand-blue",
  },
  {
    id: "gold",
    name: "Gold",
    cost: "$30k",
    blurb:
      "All the lower tiers' benefits, plus a main room talk and a Guest of Honor ticket.",
    head: "bg-tan text-navy",
    cell: "bg-peach/35",
    mark: "text-tan",
  },
  {
    id: "silver",
    name: "Silver",
    cost: "$15k",
    blurb:
      "All the Patron benefits, plus your logo on everything, a booth, and a couple of tickets.",
    head: "bg-ink/70 text-cream",
    cell: "bg-ink/[0.04]",
    mark: "text-ink/60",
  },
  {
    id: "patron",
    name: "Patron",
    cost: "$2k+",
    blurb: "Credit on our website and our gratitude.",
    head: "bg-moss text-white",
    cell: "bg-moss/12",
    mark: "text-moss",
  },
];

// true = check; string = check with a qualifier, or a bare count; false = not
// included.
type Cell = boolean | string;
// cardLabels: per-tier rewording for the stacked card view, where a row can
// say what it means instead of carrying a qualifier under a check.
const BENEFITS: {
  label: string;
  cells: Record<TierId, Cell>;
  cardLabels?: Partial<Record<TierId, string>>;
}[] = [
  {
    label: "Name/logo placement on website, swag & marketing",
    cardLabels: { patron: "Name/logo placement on website" },
    cells: {
      headline: true,
      platinum: true,
      gold: true,
      silver: true,
      patron: "Website",
    },
  },
  {
    label: "Regular tickets",
    cells: {
      headline: "5",
      platinum: "5",
      gold: "3",
      silver: "2",
      patron: false,
    },
  },
  {
    label: "Featured Night Market booth",
    cells: {
      headline: true,
      platinum: true,
      gold: true,
      silver: true,
      patron: false,
    },
  },
  {
    label: "Attendee careers database***",
    cells: {
      headline: true,
      platinum: true,
      gold: true,
      silver: true,
      patron: false,
    },
  },
  {
    label: "\u201cGuest of Honor\u201d tickets**",
    cells: {
      headline: "2",
      platinum: "2",
      gold: "1",
      silver: false,
      patron: false,
    },
  },
  {
    label: "Main room talk / short event",
    cells: {
      headline: true,
      platinum: true,
      gold: true,
      silver: false,
      patron: false,
    },
  },
  {
    label: "Premium branded session",
    cells: {
      headline: true,
      platinum: true,
      gold: false,
      silver: false,
      patron: false,
    },
  },
  {
    label: "Supply your own custom swag",
    cells: {
      headline: true,
      platinum: true,
      gold: false,
      silver: false,
      patron: false,
    },
  },
  {
    label: "Creative direction*",
    cells: {
      headline: true,
      platinum: false,
      gold: false,
      silver: false,
      patron: false,
    },
  },
];

function isCount(v: Cell): v is string {
  return typeof v === "string" && /^\d+$/.test(v);
}

// Lowest tier (Patron up) offering exactly this value — checks and counts are
// colored by the tier where that benefit first appears.
function introducedAt(benefit: (typeof BENEFITS)[number], value: Cell) {
  return [...TIERS].reverse().find((t) => benefit.cells[t.id] === value);
}

function markClass(benefit: (typeof BENEFITS)[number], value: Cell): string {
  return introducedAt(benefit, value)?.mark ?? "text-meeple";
}

function BenefitCell({ value, mark }: { value: Cell; mark: string }) {
  if (value === false) {
    return (
      <span aria-label="Not included" className="text-ink/30">
        &mdash;
      </span>
    );
  }
  if (isCount(value)) {
    return <span className={`text-[17px] font-bold ${mark}`}>{value}</span>;
  }
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <FaCheck aria-label="Included" className={mark} size={14} />
      {typeof value === "string" && (
        <span className="text-xs leading-tight font-semibold text-ink/70">
          {value}
        </span>
      )}
    </span>
  );
}

function TierCard({ tier }: { tier: (typeof TIERS)[number] }) {
  // Perks unique to this tier first, then inherited ones, highest tier down.
  const rank = (b: (typeof BENEFITS)[number]) =>
    TIERS.findIndex((t) => t.id === introducedAt(b, b.cells[tier.id])?.id);
  const rows = BENEFITS.filter((b) => b.cells[tier.id] !== false).sort(
    (a, b) => rank(a) - rank(b),
  );
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white">
      <header className={`px-5 py-4 ${tier.head}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className={`${HEADING} text-[24px]`}>{tier.name}</span>
          <span className="font-space-mono text-[13px] tracking-[0.12em] uppercase opacity-85">
            {tier.cost}
          </span>
        </div>
        {tier.limit && (
          <span className="mt-0.5 block text-[11px] font-semibold tracking-[0.06em] uppercase opacity-75">
            {tier.limit}
          </span>
        )}
      </header>
      <p
        className={`px-5 py-3.5 text-[14px] leading-snug text-ink/75 ${tier.cell}`}
      >
        {tier.blurb}
      </p>
      <ul className="divide-y divide-line px-5">
        {rows.map((b) => {
          const v = b.cells[tier.id];
          const mark = markClass(b, v);
          const label = b.cardLabels?.[tier.id];
          return (
            <li
              key={b.label}
              className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]"
            >
              <span className="flex items-baseline gap-2.5 text-ink">
                <FaCheck
                  aria-label="Included"
                  className={`relative top-[1px] shrink-0 ${mark}`}
                  size={13}
                />
                <span>
                  {isCount(v) && (
                    <span className={`font-bold ${mark}`}>{v} </span>
                  )}
                  {label ?? b.label}
                </span>
              </span>
              {!label && typeof v === "string" && !isCount(v) && (
                <span className={`shrink-0 text-[13px] font-bold ${mark}`}>
                  {v}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default function SponsorPage() {
  return (
    <ContentPage
      title="Sponsor Metagame 2026"
      intro={
        <>
          Metagame exists in large part thanks to support from our sponsors. All
          packages are flexible. If you&rsquo;re interested, fill out our{" "}
          <a
            href={SPONSOR_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
          >
            Sponsor Interest Form
          </a>
          .
        </>
      }
      wide
    >
      <a
        href="#donate"
        className="-mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-navy underline underline-offset-4 transition hover:text-meeple"
      >
        Prefer to donate? <FaArrowDown size={12} aria-hidden />
      </a>

      <section className="mt-8">
        <div className="flex flex-col gap-5 md:hidden">
          {TIERS.map((t) => (
            <TierCard key={t.id} tier={t} />
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-center text-[15px]">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-[1] w-[24%] min-w-[160px] bg-[#f5f4f2] px-4 py-4 text-left font-space-mono text-[13px] tracking-[0.18em] text-ink/70 uppercase"
                >
                  Benefit
                </th>
                {TIERS.map((t) => (
                  <th key={t.id} scope="col" className={`px-3 py-4 ${t.head}`}>
                    <span className={`${HEADING} block text-[22px]`}>
                      {t.name}
                    </span>
                    <span className="mt-1 block font-space-mono text-[13px] tracking-[0.12em] uppercase opacity-85">
                      {t.cost}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold tracking-[0.06em] uppercase opacity-75">
                      {t.limit ?? "\u00a0"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <th
                  scope="row"
                  className="sticky left-0 z-[1] bg-white px-4 py-3.5 text-left font-semibold text-ink"
                >
                  At a glance
                </th>
                {TIERS.map((t) => (
                  <td
                    key={t.id}
                    className={`px-3 py-3.5 text-left text-[13.5px] leading-snug text-ink/75 ${t.cell}`}
                  >
                    {t.blurb}
                  </td>
                ))}
              </tr>
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
                      <BenefitCell
                        value={b.cells[t.id]}
                        mark={markClass(b, b.cells[t.id])}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/55">
          *We&rsquo;ll talk.
          <br />
          **VIP badge, a ticket to the VIP dinner, a room on site, and 20 points
          <br />
          ***Opt-in per attendee
        </p>
      </section>

      <p className="mt-10 text-base text-ink/60">
        If you want to support Metagame for a smaller amount than these tiers,
        you can buy a{" "}
        <Link
          href="/#supporter"
          className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
        >
          Supporter tier ticket
        </Link>
        .
      </p>

      <section
        id="donate"
        className="mt-6 scroll-mt-16 rounded-xl border border-line bg-white px-6 py-7 sm:px-8"
      >
        <h2 className={`${HEADING} text-[clamp(22px,3vw,28px)] text-navy`}>
          Tax-deductible support
        </h2>
        <p className="mt-3 max-w-[640px] text-base text-ink/75">
          Metagame accepts tax-deductible donations through Manifund, a
          501(c)(3) that fiscally sponsors the con. Donors get our thanks and
          their name featured, but cannot get comped tickets or other direct
          material benefits, because laws.
        </p>
        <Button asChild variant="navy" size="lg" className="mt-5">
          <a href={MANIFUND_URL} target="_blank" rel="noopener noreferrer">
            Donate on Manifund <FaExternalLinkAlt size={12} aria-hidden />
          </a>
        </Button>
      </section>
    </ContentPage>
  );
}
