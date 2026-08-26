import type { Metadata } from "next";
import Link from "next/link";
import {
  FaArrowDown,
  FaArrowLeft,
  FaCheck,
  FaEnvelope,
  FaExternalLinkAlt,
  FaFilePdf,
  FaRegCalendarAlt,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { EYEBROW, HEADING } from "@/components/site/styles";

export const metadata: Metadata = {
  title: "Sponsor — Metagame 2026",
  description:
    "Sponsorship tiers for Metagame 2026: Headline, Platinum, Gold, and Silver packages. Nov 6-8, 2026 at Lighthaven, Berkeley.",
};

const CONTACT = "team@metagame.games";
const MANIFUND_URL = "https://manifund.org/projects/metagame-2026";
// TODO: drop the real prospectus PDF into public/ at this path.
const CALL_URL = "https://savvycal.com/arbor-staff/ricki?d=30";
const PROSPECTUS_URL = "/metagame-2026-sponsor-prospectus.pdf";

const PATRON_EXAMPLES = [
  "Funding and running a flagship game or megagame experience at the conference",
  "Hosting a private dinner, after-party, or exclusive event for a subset of attendees",
  "Sponsoring or creating an event",
  "Funding a charitable component (prize pool, auction, donation match)",
  "Playtesting an original game design",
];

const ATTENDEES = [
  "Professional game designers and developers",
  "Escape room and immersive experience creators",
  "Puzzle enthusiasts, crossword constructors, and ARG veterans",
  "AI researchers, founders, and tech-adjacent professionals",
  "Rationalist and EA community members",
  "Strategy gamers, tabletop RPG players, and competitive puzzle solvers",
];

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
            Want to help make the magic happen?
          </p>
          <h1 className={`${HEADING} text-[clamp(32px,5vw,52px)] text-navy`}>
            Sponsor Metagame 2026
          </h1>
          <p className="mt-4 text-lg text-ink/75">
            Metagame is three days of talks, workshops, and games at Lighthaven
            in Berkeley, November 6&ndash;8, 2026. It&rsquo;s a bespoke
            conference, by design, for high-performing problem solvers:
            attendees come through personal networks in the Bay Area&rsquo;s
            game design, puzzle, and AI communities.
          </p>
          <Button asChild variant="navy" className="mt-5">
            <a href={PROSPECTUS_URL} target="_blank" rel="noopener noreferrer">
              <FaFilePdf aria-hidden /> Download the prospectus (PDF)
            </a>
          </Button>
        </header>

        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <p className={`${EYEBROW} mb-3 text-meeple`}>Who attends?</p>
            <ul className="flex flex-col gap-1.5 text-[15px] text-ink/80">
              {ATTENDEES.map((a) => (
                <li key={a} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-meeple"
                  />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={`${EYEBROW} mb-3 text-meeple`}>Why sponsor?</p>
            <p className="text-[15px] text-ink/80">
              Metagame&rsquo;s attendees are disproportionately technically
              sophisticated, intellectually curious, and professionally
              accomplished. One of our 2025 sponsors hired at least one
              successful full-time employee out of the crowd.
            </p>
            <p className="mt-3 text-[15px] text-ink/80">
              Sponsors get their name in front of that crowd and on our swag and
              marketing, plus session slots, tickets, and more depending on
              tier.
            </p>
          </div>
        </section>

        <div className="mt-10 max-w-[720px]">
          <p className="text-base text-ink/70">
            All packages are flexible. If what you&rsquo;re looking for
            isn&rsquo;t described here,{" "}
            <a
              href={MAILTO}
              className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
            >
              reach out anyway
            </a>
            . We&rsquo;d rather build something that works for both of us than
            lose a good partner over a mismatch with a templated tier.
          </p>
          <a
            href="#donate"
            className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-navy underline underline-offset-4 transition hover:text-meeple"
          >
            Prefer to donate? <FaArrowDown size={12} aria-hidden />
          </a>
        </div>

        <section className="mt-12">
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-center text-[15px]">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-[1] w-[28%] min-w-[160px] bg-[#f5f4f2] px-4 py-4 text-left font-space-mono text-[13px] tracking-[0.18em] text-ink/70 uppercase"
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
                      <span className="mt-0.5 block text-[11px] font-semibold tracking-[0.06em] uppercase opacity-75">
                        {t.limit ?? "\u00a0"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Blurb row: the one-line pitch per tier, ahead of the checklist. */}
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
                        <BenefitCell value={b.cells[t.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14 rounded-xl border border-line bg-white px-6 py-7 sm:px-8">
          <p className={`${EYEBROW} mb-2.5 text-meeple`}>Patron sponsorship</p>
          <h2 className={`${HEADING} text-[clamp(22px,3vw,28px)] text-navy`}>
            Starting at $4,096
          </h2>
          <p className="mt-1 text-[15px] text-ink/60">
            Structured around what you want to create.
          </p>
          <p className="mt-4 max-w-[680px] text-base text-ink/75">
            The Patron track exists for people who want Metagame to exist, to be
            excellent, and ideally to have their fingerprints on it. Patrons
            tell us what they want to bring to the conference, and we work with
            them to make it happen. Patron benefits scale with the level of
            contribution.
          </p>
          <p className="mt-4 text-[15px] font-semibold text-ink">
            What patronage can look like:
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[15px] text-ink/80">
            {PATRON_EXAMPLES.map((x) => (
              <li key={x} className="flex gap-2.5">
                <span
                  aria-hidden
                  className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-meeple"
                />
                {x}
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-[680px] text-base text-ink/75">
            Patronage is flexible, and can be tailored to whatever you have in
            mind. Contact{" "}
            <a
              href={MAILTO}
              className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
            >
              {CONTACT}
            </a>{" "}
            or{" "}
            <a
              href={CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
            >
              schedule a call
            </a>{" "}
            for more information.
          </p>
        </section>

        <section
          id="donate"
          className="mt-14 scroll-mt-16 rounded-xl border border-line bg-white px-6 py-7 sm:px-8"
        >
          <h2 className={`${HEADING} text-[clamp(22px,3vw,28px)] text-navy`}>
            Tax-deductible support
          </h2>
          <p className="mt-3 max-w-[640px] text-base text-ink/75">
            Metagame accepts tax-deductible donations through Manifund, a
            501(c)(3) that fiscally sponsors our project. Donors get our thanks
            and their name featured, but cannot get comped tickets or other
            direct material benefits, because laws.
          </p>
          <Button asChild variant="navy" size="lg" className="mt-5">
            <a href={MANIFUND_URL} target="_blank" rel="noopener noreferrer">
              Donate on Manifund <FaExternalLinkAlt size={12} aria-hidden />
            </a>
          </Button>
        </section>

        <section className="mt-14 rounded-xl bg-navy px-6 py-8 text-cream sm:px-10">
          <h2 className={`${HEADING} text-[clamp(24px,3.5vw,32px)]`}>
            Interested?
          </h2>
          <p className="mt-3 max-w-[560px] text-base text-cream/80">
            Email the team or schedule a call. Happy to mix and match benefits,
            talk about in-kind sponsorship, or hear an idea we haven&rsquo;t
            thought of.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={MAILTO}>
                <FaEnvelope aria-hidden /> {CONTACT}
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href={CALL_URL} target="_blank" rel="noopener noreferrer">
                <FaRegCalendarAlt aria-hidden /> Schedule a call
              </a>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
