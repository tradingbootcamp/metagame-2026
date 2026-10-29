import Image from "next/image";
import Link from "next/link";
import {
  GOLD_SPONSORS,
  PATRON_SPONSORS,
  SILVER_SPONSORS,
  type Sponsor,
} from "@/v2/data/sponsors";
import { DISPLAY, TOKEN } from "./styles";

// The tiers as rarities in a card set. Logo sizes per tier are the sponsors
// section's, unchanged.
const TIERS = [
  {
    tier: "Gold",
    rarity: "Legendary",
    stars: 3,
    sponsors: GOLD_SPONSORS,
    span: "lg:col-span-2",
    logo: "h-28 md:h-40",
  },
  {
    tier: "Silver",
    rarity: "Epic",
    stars: 2,
    sponsors: SILVER_SPONSORS,
    span: "lg:col-span-2",
    logo: "h-16 md:h-24",
  },
  {
    tier: "Patron",
    rarity: "Rare",
    stars: 1,
    sponsors: PATRON_SPONSORS,
    span: "",
    logo: "h-14 md:h-[72px]",
  },
];

// Every sponsor in set order, numbered.
const NUMBERED = new Map(
  TIERS.flatMap((t) => t.sponsors).map((s, i) => [s.name, i + 1]),
);
const no = (n: number) => `No. ${String(n).padStart(2, "0")}`;

function SponsorLogo({ s, t }: { s: Sponsor; t: (typeof TIERS)[number] }) {
  const cls = `w-auto max-w-full object-contain ${s.logoClass ?? t.logo}`;
  const logo = (
    <span className="grid min-h-28 flex-1 place-items-center transition-transform duration-300 group-hover:-translate-y-1 md:min-h-32">
      {s.Logo ? (
        <s.Logo className={cls} />
      ) : (
        <Image src={s.logo} alt={`${s.name} logo`} className={cls} />
      )}
    </span>
  );
  const caption = (
    <span className="mt-3 flex items-baseline justify-between gap-2 border-t border-navy/15 pt-2">
      <span
        className={`${DISPLAY} text-[22px] leading-none tracking-[0.02em] text-navy`}
      >
        {s.name}
      </span>
      <span className="shrink-0 font-space-mono text-[10px] tracking-[0.08em] whitespace-nowrap text-ink/50 uppercase">
        {no(NUMBERED.get(s.name) ?? 0)}
      </span>
    </span>
  );
  return s.url ? (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${s.name}, ${t.tier} sponsor`}
      className="group flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      {logo}
      {caption}
    </a>
  ) : (
    <div className="group flex h-full flex-col">
      {logo}
      {caption}
    </div>
  );
}

// The credits as a card set laid out on the page: each tier under its rule,
// rarer by tier, every logo numbered, and the set still has a slot open
// (after Silver).
export default function SponsorDeck() {
  return (
    <div className="flex flex-col gap-12">
      {TIERS.map((t) => (
        <section key={t.tier} aria-label={`${t.tier} sponsors`}>
          <p className="flex items-baseline justify-between gap-3 border-t-2 border-navy pt-2.5 font-space-mono text-[11px] font-bold tracking-[0.14em] text-navy uppercase">
            <span>
              {t.rarity} · {t.tier}
            </span>
            <span aria-hidden className="tracking-[0.2em] text-meeple">
              {"★".repeat(t.stars)}
            </span>
          </p>
          <ul className="mt-6 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {t.sponsors.map((s) => (
              <li key={s.name} className={t.span}>
                <SponsorLogo s={s} t={t} />
              </li>
            ))}
            {t.tier === "Silver" && (
              <li className="lg:col-span-2">
                <Link
                  href="/sponsor"
                  className="group flex h-full min-h-40 items-center gap-5 outline-none focus-visible:ring-2 focus-visible:ring-meeple"
                >
                  <span
                    aria-hidden
                    className={`${TOKEN} size-20 border-2 border-dashed border-navy/40 ${DISPLAY} text-5xl text-navy/30 transition-[rotate,border-color] duration-300 group-hover:-rotate-12 group-hover:border-navy`}
                  >
                    ?
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span
                      className={`${DISPLAY} text-[30px] leading-none text-navy`}
                    >
                      Your logo here?
                    </span>
                    <span className="max-w-[28em] text-sm text-ink/70">
                      A few slots left in the 2026 set. Sponsor Metagame and
                      complete the collection.
                    </span>
                    <span className="font-space-mono text-[11px] font-bold tracking-[0.12em] text-meeple uppercase group-hover:underline">
                      No. ?? · See sponsor tiers →
                    </span>
                  </span>
                </Link>
              </li>
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
