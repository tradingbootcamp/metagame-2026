"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import BtcModal from "@/v2/components/tickets/BtcModal";
import DayPassModal from "@/v2/components/tickets/DayPassModal";
import DiscountRateModal from "@/v2/components/tickets/DiscountRateModal";
import FamilyPackModal from "@/v2/components/tickets/FamilyPackModal";
import FriendSwagModal from "@/v2/components/tickets/FriendSwagModal";
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
import { withPromo, withUtm } from "@/lib/utm";
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
// with a salmon hard-shadow that grows and slides up-left on hover). Their min
// height matches a three-line tile, so tiles stay even without the row
// stretching them (it can't: the family tile's swag bubble adds height).
// "rulebook": the home page's join chapter, a price list on the page. Each
// ticket is a ruled row (the "tile" Button variant) with its name and a
// plain-words note on the left and a Bebas price on the right.
const LOOKS = {
  raised: {
    variant: "raised",
    row: "flex flex-wrap items-start gap-[18px] max-[460px]:*:w-full",
    tile: "min-h-[112px] min-w-[210px] flex-col gap-1 px-7 py-4 max-[460px]:w-full",
    main: "",
    label:
      "font-space-mono text-[13px] tracking-[0.18em] uppercase whitespace-nowrap text-cream/85",
    price: `${HEADING} text-[30px] leading-none text-tan`,
    strike: "text-[18px] font-bold text-cream/40 line-through",
    note: "font-space-mono text-[11px] tracking-[0.08em] uppercase whitespace-nowrap text-cream/60",
    // The bubble straddles the tile's bottom edge and follows its hover lift;
    // the margin keeps it clear of whatever tile wraps in below.
    swagRow: "mb-9",
    swagTile: "",
    swag: "absolute inset-x-0 -bottom-8 z-10 mx-auto w-[190px] -rotate-2 scroll-mt-24 rounded-2xl border-2 border-navy bg-meeple px-2.5 py-1.5 text-center font-space-mono text-[10px] leading-[1.25] font-bold tracking-[0.04em] text-cream uppercase shadow-[3px_3px_0_0_var(--color-navy)] transition-[translate,scale] duration-150 peer-hover:-translate-[5px] hover:scale-105",
  },
  rulebook: {
    variant: "tile",
    row: "grid w-full gap-x-10 border-t-2 border-navy sm:grid-cols-2",
    // A row stretched to its neighbour's height (the family row, with its
    // bubble) keeps its lines together at the top.
    tile: "w-full content-start",
    main: "bg-tan/25 hover:bg-tan/40",
    label:
      "font-space-mono text-xs font-bold tracking-[0.14em] uppercase text-meeple",
    price: `${DISPLAY} text-[40px] leading-none text-navy`,
    strike: "text-lg font-bold text-navy/35 line-through",
    note: "text-[13.5px] font-normal text-ink/60",
    // The bubble sits in its row, under the note, so the rules stay even:
    // flat, with no hard shadow.
    swagRow: "",
    swagTile: "pb-14",
    swag: "absolute bottom-4 left-2 z-10 max-w-[calc(100%-1rem)] -rotate-2 scroll-mt-24 rounded-2xl border-2 border-navy bg-meeple px-2.5 py-1 font-space-mono text-[10px] leading-[1.25] font-bold tracking-[0.04em] text-cream uppercase transition-transform duration-150 hover:scale-105",
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

// UTMs and any promo code live in localStorage, so they're added at click time
// (not render) to keep the server-rendered href stable.
const addUtm = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.href = withPromo(withUtm(href));
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

const HASH_MODALS = [
  "supporter",
  "day-pass",
  "family-pack",
  "friend-swag",
  "discount-rate",
] as const;
type HashModal = (typeof HASH_MODALS)[number];
const isHashModal = (id: string): id is HashModal =>
  (HASH_MODALS as readonly string[]).includes(id);

export default function TicketsPanel({
  showHeading = true,
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
  look?: keyof typeof LOOKS;
}) {
  const look = LOOKS[lookName];
  const rulebook = lookName === "rulebook";
  const start = align === "start";
  const earlyBirdActive = useSyncExternalStore(
    subscribeNever,
    isEarlyBirdActive,
    () => earlyBird,
  );
  const standard = getTicket("standard");
  // Each tile that opens a modal (rather than linking straight to Stripe)
  // deep-links from /#<id>, e.g. /#supporter from /sponsor or /#family-pack
  // from an email; the tile's id gives the browser its scroll target. Closing
  // drops the hash so a repeat click on the same link changes the URL again
  // and reopens it.
  const [openModal, setOpenModal] = useState<HashModal | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const closeModal = () => {
    setOpenModal(null);
    if (isHashModal(window.location.hash.slice(1))) {
      router.replace(pathname, { scroll: false });
    }
  };
  useEffect(() => {
    const check = () => {
      const id = window.location.hash.slice(1);
      if (isHashModal(id)) setOpenModal(id);
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
          onClick={() => setOpenModal("supporter")}
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
          id="day-pass"
          onClick={() => setOpenModal("day-pass")}
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
        {/* The swag bubble is a sibling, not a child: a button can't nest in
            the tile's button. */}
        <div className={cn("relative flex", look.swagRow)}>
          <Tile
            look={look}
            id="family-pack"
            onClick={() => setOpenModal("family-pack")}
            // Raised: narrower padding so the long label fits the shared 210px
            // tile.
            className={cn("peer", look.swagTile, !rulebook && "px-4")}
          >
            <span className={look.label}>Family &amp; Friends</span>
            <span className="flex items-baseline gap-2.5 leading-none">
              <span className={look.strike}>${STANDARD_USD}</span>
              <span className={look.price}>${FAMILY_PACK.usd}</span>
            </span>
            <span className={look.note}>
              {rulebook
                ? `Each, in a bundle of ${FAMILY_PACK.min}–${FAMILY_PACK.max}.`
                : `each · ${FAMILY_PACK.min}–${FAMILY_PACK.max} tickets`}
            </span>
          </Tile>
          <button
            type="button"
            id="friend-swag"
            onClick={() => setOpenModal("friend-swag")}
            className={look.swag}
          >
            Plus special bring‑a‑friend reward swag
          </button>
        </div>
        <Tile
          look={look}
          id="discount-rate"
          onClick={() => setOpenModal("discount-rate")}
        >
          <span className={look.label}>Student / Aid</span>
          <span className={look.price}>50% off</span>
          {rulebook && (
            <span className={look.note}>
              For students, nonprofit staff and anyone in need.
            </span>
          )}
        </Tile>
        <Button
          asChild
          variant={look.variant}
          className={cn(look.tile, rulebook && "whitespace-normal")}
        >
          <VolunteerFormLink>
            <span className={look.label}>Volunteer</span>
            <span className={look.price}>$0</span>
            {rulebook && (
              <span className={look.note}>
                A limited supply, for volunteers.
              </span>
            )}
          </VolunteerFormLink>
        </Button>
      </div>
      {openModal === "supporter" && <SupporterModal onClose={closeModal} />}
      {openModal === "day-pass" && <DayPassModal onClose={closeModal} />}
      {openModal === "discount-rate" && (
        <DiscountRateModal onClose={closeModal} />
      )}
      {openModal === "family-pack" && <FamilyPackModal onClose={closeModal} />}
      {openModal === "friend-swag" && (
        <FriendSwagModal
          onClose={closeModal}
          onBuy={() => setOpenModal("family-pack")}
        />
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
