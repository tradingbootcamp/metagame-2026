"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  GOLD_SPONSORS,
  PATRON_SPONSORS,
  SILVER_SPONSORS,
  type Sponsor,
} from "@/v2/data/sponsors";
import { DISPLAY } from "./styles";

// The tiers as rarities in a card set. Logo sizes per tier are the sponsors
// section's, unchanged; `foil` is the sheen that follows the pointer.
const TIERS = [
  {
    tier: "Gold",
    rarity: "Legendary",
    stars: 3,
    sponsors: GOLD_SPONSORS,
    span: "lg:col-span-2",
    band: "bg-tan",
    logo: "h-28 md:h-40",
    foil: "rgba(255,214,102,0.55), rgba(255,138,61,0.35), rgba(132,214,255,0.4)",
  },
  {
    tier: "Silver",
    rarity: "Epic",
    stars: 2,
    sponsors: SILVER_SPONSORS,
    span: "lg:col-span-2",
    band: "bg-sky",
    logo: "h-16 md:h-24",
    foil: "rgba(220,228,240,0.7), rgba(132,214,255,0.4), rgba(206,225,255,0.5)",
  },
  {
    tier: "Patron",
    rarity: "Rare",
    stars: 1,
    sponsors: PATRON_SPONSORS,
    span: "",
    band: "bg-peach",
    logo: "h-14 md:h-[72px]",
    foil: "rgba(255,255,255,0.7), rgba(255,216,165,0.4), rgba(255,255,255,0)",
  },
];

// Every sponsor in set order, numbered.
const CARDS = TIERS.flatMap((t) => t.sponsors.map((s) => ({ s, t }))).map(
  (c, i) => ({ ...c, n: i + 1 }),
);

// The open slot sits right after Silver, filling that half row.
const SLOT_AFTER =
  CARDS.findLastIndex((c) => c.t.tier === "Silver") + 1 || CARDS.length;
const no = (n: number) => `No. ${String(n).padStart(2, "0")}`;

// A card that tilts toward the pointer and catches the light on its foil.
function Holo({ children, foil }: { children: ReactNode; foil: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${((0.5 - y) * 8).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * 10).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    for (const v of ["--rx", "--ry", "--mx", "--my"])
      el.style.removeProperty(v);
  };
  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className="group/holo h-full [perspective:900px]"
    >
      <div className="relative h-full [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] transition-transform duration-150 ease-out motion-reduce:[transform:none]">
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 mix-blend-multiply transition-opacity duration-300 group-hover/holo:opacity-60 motion-reduce:hidden"
          style={{
            background: `radial-gradient(circle at var(--mx,50%) var(--my,50%), ${foil.split(", ")[0]}, transparent 55%), linear-gradient(115deg, transparent 25%, ${foil}, transparent 75%)`,
          }}
        />
      </div>
    </div>
  );
}

function SponsorCard({
  s,
  t,
  n,
}: {
  s: Sponsor;
  t: (typeof TIERS)[number];
  n: number;
}) {
  const cls = `w-auto max-w-full object-contain ${s.logoClass ?? t.logo}`;
  const card = (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-navy bg-white shadow-[5px_5px_0_0_var(--color-navy)]">
      <div
        className={`flex items-center justify-between gap-2 border-b-2 border-navy px-4 py-2 ${t.band}`}
      >
        <span className="font-space-mono text-[11px] font-bold tracking-[0.14em] text-navy uppercase">
          {t.rarity} · {t.tier}
        </span>
        <span aria-hidden className="tracking-[0.2em] text-navy">
          {"★".repeat(t.stars)}
        </span>
      </div>
      <div className="grid flex-1 place-items-center px-6 py-8">
        {s.Logo ? (
          <s.Logo className={cls} />
        ) : (
          <Image src={s.logo} alt={`${s.name} logo`} className={cls} />
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2 border-t border-line px-4 py-2">
        <span
          className={`${DISPLAY} text-[22px] leading-none tracking-[0.02em] text-navy`}
        >
          {s.name}
        </span>
        <span className="shrink-0 font-space-mono text-[10px] tracking-[0.08em] whitespace-nowrap text-ink/50 uppercase">
          {no(n)}
        </span>
      </div>
    </div>
  );
  return (
    <Holo foil={t.foil}>
      {s.url ? (
        <a
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${s.name}, ${t.tier} sponsor`}
          className="block h-full rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-tan"
        >
          {card}
        </a>
      ) : (
        card
      )}
    </Holo>
  );
}

// The credits as a card set: every sponsor is a collectible, rarer by tier,
// and the set still has slots open.
export default function SponsorDeck() {
  const slot = (
    <li key="slot" className="lg:col-span-2">
      <Link
        href="/sponsor"
        className="group flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy/50 bg-sky/30 p-6 text-center transition-colors hover:border-navy hover:bg-sky/60"
      >
        <span
          aria-hidden
          className={`${DISPLAY} text-6xl leading-none text-navy/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
        >
          ?
        </span>
        <span className={`${DISPLAY} text-[28px] leading-none text-navy`}>
          Your card here?
        </span>
        <span className="max-w-[28em] text-sm text-ink/70">
          A few slots left in the 2026 set. Sponsor Metagame and complete the
          collection.
        </span>
        <span className="mt-2 font-space-mono text-[11px] font-bold tracking-[0.12em] text-meeple uppercase">
          No. ?? · See sponsor tiers →
        </span>
      </Link>
    </li>
  );

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.flatMap((c, i) => {
        const item = (
          <li key={c.s.name} className={c.t.span}>
            <SponsorCard s={c.s} t={c.t} n={c.n} />
          </li>
        );
        return i === SLOT_AFTER - 1 ? [item, slot] : [item];
      })}
    </ul>
  );
}
