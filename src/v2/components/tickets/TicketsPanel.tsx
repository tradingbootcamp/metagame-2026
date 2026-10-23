"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import BtcModal from "@/v2/components/tickets/BtcModal";
import DayPassModal from "@/v2/components/tickets/DayPassModal";
import FamilyPackModal from "@/v2/components/tickets/FamilyPackModal";
import SupporterModal from "@/v2/components/tickets/SupporterModal";
import { Button } from "@/v2/components/ui/button";
import {
  dayPasses,
  getTicket,
  stripeCheckoutHref,
  supporterTier,
} from "@/v2/lib/tickets";
import { FAMILY_PACK, STANDARD_USD } from "@/lib/family-pack";
import { EARLY_BIRD_DEADLINE, isEarlyBirdActive } from "@/lib/early-bird";
import { withUtm } from "@/lib/utm";
import { FINANCIAL_AID_FORM_URL } from "@/v2/lib/links";
import { cn } from "@/v2/lib/utils";
import VolunteerFormLink from "@/v2/components/VolunteerFormLink";
import {
  subscribeCurrency,
  getCurrencySnapshot,
  getCurrencyServerSnapshot,
  setCurrency,
} from "@/v2/lib/currency-store";
import { DISPLAY, HEADING } from "../styles";

// Two looks for the same tiles. "raised": square tiles, mono uppercase label
// over a big grotesk price, on the raised Button variant (bordered navy face
// with a salmon hard-shadow that grows and slides up-left on hover).
// "rulebook": the home page's join panel, cream cards in a grid with a Bebas
// price and a plain-words note; the panel supplies its own volunteer and aid
// links there.
const LOOKS = {
  raised: {
    variant: "raised",
    row: "flex flex-wrap items-stretch gap-[18px] max-[460px]:*:w-full",
    tile: "min-w-[210px] flex-col gap-1 px-7 py-4 max-[460px]:w-full",
    main: "",
    label:
      "font-space-mono text-[13px] tracking-[0.18em] uppercase whitespace-nowrap text-cream/85",
    price: `${HEADING} text-[30px] leading-none text-tan`,
    strike: "text-[18px] font-bold text-cream/40 line-through",
    note: "font-space-mono text-[11px] tracking-[0.08em] uppercase whitespace-nowrap text-cream/60",
  },
  rulebook: {
    variant: "tile",
    row: "grid w-full gap-2.5 sm:grid-cols-2 lg:grid-cols-4",
    tile: "h-full flex-col items-start justify-start gap-1 p-4 text-left whitespace-normal",
    main: "bg-tan",
    label:
      "font-space-mono text-xs font-bold tracking-[0.14em] uppercase text-meeple",
    price: `${DISPLAY} mt-1 text-[46px] leading-none text-navy`,
    strike: "text-lg font-bold text-navy/35 line-through",
    note: "text-[13.5px] font-normal text-ink/60",
  },
} as const;
type Look = (typeof LOOKS)[keyof typeof LOOKS];

// The tickets UI for the home page's tickets section: a currency toggle over the early-bird ticket (USD → Stripe Checkout;
// BTC → the OpenNode BtcModal) and the pay-what-you-want supporter tile, both
// driven by the shared currency store, with the supporter/BTC flows stacking on
// top. Renders bare inner content — the navy panel box comes from the modal's
// DialogContent or the section wrapper.
const subscribeNever = () => () => {};

const EARLY_BIRD_HREF = stripeCheckoutHref({ tier: "standard" });
const FULL_PRICE_HREF = stripeCheckoutHref({ tier: "standard", code: "own" });

// UTMs live in localStorage, so they're added at click time (not render) to keep
// the server-rendered href stable.
const addUtm = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.href = withUtm(href);
};

// One ticket: a checkout link (USD) or a button that opens a flow.
function Tile({
  look,
  main = false,
  href,
  onClick,
  id,
  className,
  children,
}: {
  look: Look;
  main?: boolean;
  href?: string;
  onClick?: () => void;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = cn(look.tile, main && look.main, className);
  return href ? (
    <Button asChild variant={look.variant} className={cls}>
      <a
        href={href}
        onClick={addUtm(href)}
        onAuxClick={addUtm(href)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    </Button>
  ) : (
    <Button
      type="button"
      variant={look.variant}
      id={id}
      onClick={onClick}
      className={cls}
    >
      {children}
    </Button>
  );
}

export default function TicketsPanel({
  showHeading = true,
  surface = "dark",
  align = "center",
  earlyBird,
  look: lookName = "raised",
}: {
  // Whether early-bird was live when the page rendered; the client re-checks its
  // own clock after hydration so a cached page still flips at the deadline.
  earlyBird: boolean;
  // Centred in the modal; the left-aligned tickets section ranges everything left.
  align?: "center" | "start";
  // The modal shows its own "Tickets" heading; the one-pager section supplies a
  // SectionHeading above the (now background-less) panel, so it hides this one.
  showHeading?: boolean;
  // The tiles carry their own navy face, but bare text has to match what's behind
  // the panel: navy in the modal, the cream page background in the section.
  surface?: "dark" | "light";
  look?: keyof typeof LOOKS;
}) {
  const look = LOOKS[lookName];
  const rulebook = lookName === "rulebook";
  const onDark = surface === "dark";
  const start = align === "start";
  const earlyBirdActive = useSyncExternalStore(
    subscribeNever,
    isEarlyBirdActive,
    () => earlyBird,
  );
  const standard = getTicket("standard");
  const [supporterOpen, setSupporterOpen] = useState(false);
  const [dayPassOpen, setDayPassOpen] = useState(false);
  const [familyPackOpen, setFamilyPackOpen] = useState(false);
  // /#supporter deep-links into the modal (e.g. from /sponsor); the tile's id
  // gives the browser its scroll target. Closing drops the hash so a repeat
  // click on the same link changes the URL again and reopens it.
  const router = useRouter();
  const pathname = usePathname();
  const closeSupporter = () => {
    setSupporterOpen(false);
    if (window.location.hash === "#supporter") {
      router.replace(pathname, { scroll: false });
    }
  };
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#supporter") setSupporterOpen(true);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  // Which tile opened the BTC modal decides whether the promo code is prefilled.
  const [btcOpen, setBtcOpen] = useState<"early-bird" | "standard" | null>(
    null,
  );

  const currency = useSyncExternalStore(
    subscribeCurrency,
    getCurrencySnapshot,
    getCurrencyServerSnapshot,
  );
  const isBtc = currency === "btc";
  const money = (usd: number, btc: number) => (isBtc ? `₿${btc}` : `$${usd}`);

  return (
    <>
      {showHeading && (
        <p className={`${HEADING} text-[clamp(20px,2.6vw,26px)] text-cream`}>
          Tickets
        </p>
      )}

      {/* USD/BTC toggle: one currency governs both tiles + the supporter modal.
          The tan knob slides over the active half; the label under it darkens
          to navy for contrast. */}
      <button
        type="button"
        role="switch"
        aria-checked={isBtc}
        aria-label="Pay in USD or BTC"
        onClick={() => setCurrency(isBtc ? "usd" : "btc")}
        className="relative flex h-9 w-[136px] items-center rounded-full border border-cream/25 bg-navy2 p-1 font-space-mono text-[13px] tracking-[0.08em] uppercase select-none"
      >
        <span
          aria-hidden
          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-tan transition-transform duration-200 ${
            isBtc ? "translate-x-full" : "translate-x-0"
          }`}
        />
        <span
          className={`relative z-[1] flex-1 text-center transition-colors ${
            isBtc ? "text-cream/70" : "text-navy"
          }`}
        >
          USD
        </span>
        <span
          className={`relative z-[1] flex-1 text-center transition-colors ${
            isBtc ? "text-navy" : "text-cream/70"
          }`}
        >
          BTC
        </span>
      </button>

      <div
        className={cn(
          look.row,
          !rulebook && (start ? "justify-start" : "justify-center"),
        )}
      >
        {standard && earlyBirdActive && (
          <Tile
            look={look}
            main
            href={isBtc ? undefined : EARLY_BIRD_HREF}
            onClick={() => setBtcOpen("early-bird")}
          >
            <span className={look.label}>Early-bird</span>
            <span className="flex items-baseline gap-2.5 leading-none">
              <span className={look.strike}>
                {money(standard.prices.full.usd, standard.prices.full.btc)}
              </span>
              <span className={look.price}>
                {money(
                  standard.prices.earlyBird.usd,
                  standard.prices.earlyBird.btc,
                )}
              </span>
            </span>
            <span className={look.note}>
              {rulebook
                ? `Until ${EARLY_BIRD_DEADLINE}.`
                : `until ${EARLY_BIRD_DEADLINE}`}
            </span>
          </Tile>
        )}
        {/* Full price, no promo auto-applied: for after the deadline, or for
            anyone bringing their own code. */}
        {standard && (
          <Tile
            look={look}
            main={!earlyBirdActive}
            href={isBtc ? undefined : FULL_PRICE_HREF}
            onClick={() => setBtcOpen("standard")}
          >
            <span className={look.label}>Standard</span>
            <span className={look.price}>
              {money(standard.prices.full.usd, standard.prices.full.btc)}
            </span>
            {rulebook && <span className={look.note}>The whole weekend.</span>}
          </Tile>
        )}
        <Tile
          look={look}
          id="supporter"
          onClick={() => setSupporterOpen(true)}
          className="scroll-mt-24"
        >
          <span className={look.label}>Supporter</span>
          <span className={look.price}>
            {money(supporterTier.floor.usd, supporterTier.floor.btc)}+
          </span>
          {rulebook && (
            <span className={look.note}>
              The whole weekend, plus you help make it happen.
            </span>
          )}
        </Tile>
        {/* Day passes: USD → the modal's Stripe links, BTC → its OpenNode form. */}
        <Tile
          look={look}
          onClick={() => setDayPassOpen(true)}
          // Raised: narrower padding + a 32px line box so the three-price line
          // fits the shared 210px tile at the same height as the others.
          className={rulebook ? undefined : "px-4"}
        >
          <span className={look.label}>Day pass</span>
          {rulebook ? (
            <>
              <span className={look.price}>
                {isBtc
                  ? `₿${Math.min(...dayPasses.map((p) => p.btc))}–${Math.max(...dayPasses.map((p) => p.btc))}`
                  : `$${Math.min(...dayPasses.map((p) => p.usd))}–${Math.max(...dayPasses.map((p) => p.usd))}`}
              </span>
              <span className={look.note}>
                {dayPasses
                  .map(
                    (p) => `${p.date.long.slice(0, 3)} ${money(p.usd, p.btc)}`,
                  )
                  .join(" · ")}
              </span>
            </>
          ) : (
            <>
              <span
                className={`${HEADING} leading-[32px] text-tan ${isBtc ? "text-[15px]" : "text-[22px]"}`}
              >
                {isBtc
                  ? `₿${dayPasses.map((p) => p.btc).join("/")}`
                  : dayPasses.map((p) => `$${p.usd}`).join("/")}
              </span>
              <span className={look.note}>
                {dayPasses.map((p) => p.date.long.slice(0, 3)).join(" · ")}
              </span>
            </>
          )}
        </Tile>
        <Tile look={look} onClick={() => setFamilyPackOpen(true)}>
          <span className={look.label}>Family &amp; Friends</span>
          <span className="flex items-baseline gap-2.5 leading-none">
            <span className={look.strike}>${STANDARD_USD}</span>
            <span className={look.price}>${FAMILY_PACK.usd}</span>
          </span>
          <span className={look.note}>
            {rulebook
              ? `Each, in a bundle of ${FAMILY_PACK.min}–${FAMILY_PACK.max}.`
              : `each · ${FAMILY_PACK.min}–${FAMILY_PACK.max} ticket bundle`}
          </span>
        </Tile>
        {/* Volunteer + financial aid: plain application links, deliberately not
            styled like the purchase tiles. */}
        {!rulebook && (
          <div
            className={`w-full text-sm ${start ? "text-left" : "text-center"} ${onDark ? "text-cream/70" : "text-ink/70"} flex flex-col gap-1.5`}
          >
            <span>
              A limited supply of volunteer tickets are available.{" "}
              <VolunteerFormLink
                className={`font-bold underline underline-offset-2 ${onDark ? "text-tan" : "text-meeple"}`}
              >
                Apply to volunteer
              </VolunteerFormLink>
            </span>
            <span>
              Ticket price out of reach?{" "}
              <a
                href={FINANCIAL_AID_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-bold underline underline-offset-2 ${onDark ? "text-tan" : "text-meeple"}`}
              >
                Apply for financial aid
              </a>
            </span>
          </div>
        )}
      </div>
      {supporterOpen && <SupporterModal onClose={closeSupporter} />}
      {dayPassOpen && <DayPassModal onClose={() => setDayPassOpen(false)} />}
      {familyPackOpen && (
        <FamilyPackModal onClose={() => setFamilyPackOpen(false)} />
      )}
      {btcOpen && standard && (
        <BtcModal
          ticket={standard}
          initialCode={btcOpen === "early-bird" ? "EARLYBIRD" : ""}
          onClose={() => setBtcOpen(null)}
        />
      )}
    </>
  );
}
