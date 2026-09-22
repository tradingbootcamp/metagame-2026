"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import BtcModal from "@/v2/components/tickets/BtcModal";
import DayPassModal from "@/v2/components/tickets/DayPassModal";
import SupporterModal from "@/v2/components/tickets/SupporterModal";
import { Button } from "@/v2/components/ui/button";
import {
  dayPasses,
  fullPriceTicketUrl,
  getTicket,
  supporterTier,
  ticketUrl,
} from "@/v2/lib/tickets";
import { EARLY_BIRD_DEADLINE, isEarlyBirdActive } from "@/lib/early-bird";
import { FINANCIAL_AID_FORM_URL, VOLUNTEER_FORM_URL } from "@/v2/lib/links";
import {
  subscribeCurrency,
  getCurrencySnapshot,
  getCurrencyServerSnapshot,
  setCurrency,
} from "@/v2/lib/currency-store";
import { HEADING } from "../styles";

// Square ticket tiles: mono uppercase label over a big grotesk price, rendered
// via the raised Button variant (bordered navy face with a salmon hard-shadow
// that grows and slides up-left on hover). Layout only; the visual lives in the
// variant.
const TILE = "min-w-[210px] flex-col gap-1 px-7 py-4 max-[460px]:w-full";
const TILE_LABEL =
  "font-space-mono text-[13px] tracking-[0.18em] uppercase whitespace-nowrap text-cream/85";
const TILE_NOTE =
  "font-space-mono text-[11px] tracking-[0.08em] uppercase whitespace-nowrap text-cream/60";

// The tickets UI for the home page's tickets section: a currency toggle over the early-bird ticket (USD → Stripe Payment Link;
// BTC → the OpenNode BtcModal) and the pay-what-you-want supporter tile, both
// driven by the shared currency store, with the supporter/BTC flows stacking on
// top. Renders bare inner content — the navy panel box comes from the modal's
// DialogContent or the section wrapper.
const subscribeNever = () => () => {};

export default function TicketsPanel({
  showHeading = true,
  surface = "dark",
  align = "center",
  earlyBird,
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
}) {
  const onDark = surface === "dark";
  const start = align === "start";
  const earlyBirdActive = useSyncExternalStore(
    subscribeNever,
    isEarlyBirdActive,
    () => earlyBird,
  );
  const standard = getTicket("standard");
  const earlyBirdHref = standard ? ticketUrl(standard) : null;
  const standardHref = standard ? fullPriceTicketUrl(standard) : null;
  const [supporterOpen, setSupporterOpen] = useState(false);
  const [dayPassOpen, setDayPassOpen] = useState(false);
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
        className={`flex flex-wrap items-stretch gap-[18px] max-[460px]:*:w-full ${start ? "justify-start" : "justify-center"}`}
      >
        {standard &&
          earlyBirdActive &&
          (isBtc ? (
            <Button
              type="button"
              variant="raised"
              onClick={() => setBtcOpen("early-bird")}
              className={TILE}
            >
              <span className={TILE_LABEL}>Early-bird</span>
              <span className="flex items-baseline gap-2.5 leading-none">
                <span className="text-[18px] font-bold text-cream/40 line-through">
                  &#8383;{standard.prices.full.btc}
                </span>
                <span className={`${HEADING} text-[30px] text-tan`}>
                  &#8383;{standard.prices.earlyBird.btc}
                </span>
              </span>
              <span className={TILE_NOTE}>until {EARLY_BIRD_DEADLINE}</span>
            </Button>
          ) : (
            earlyBirdHref && (
              <Button asChild variant="raised" className={TILE}>
                <a
                  href={earlyBirdHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={TILE_LABEL}>Early-bird</span>
                  <span className="flex items-baseline gap-2.5 leading-none">
                    <span className="text-[18px] font-bold text-cream/40 line-through">
                      ${standard.prices.full.usd}
                    </span>
                    <span className={`${HEADING} text-[30px] text-tan`}>
                      ${standard.prices.earlyBird.usd}
                    </span>
                  </span>
                  <span className={TILE_NOTE}>until {EARLY_BIRD_DEADLINE}</span>
                </a>
              </Button>
            )
          ))}
        {/* Full price, no promo code: for after the deadline, or for anyone
            who'd rather not use one. */}
        {standard &&
          (isBtc ? (
            <Button
              type="button"
              variant="raised"
              onClick={() => setBtcOpen("standard")}
              className={TILE}
            >
              <span className={TILE_LABEL}>Standard</span>
              <span className={`${HEADING} text-[30px] leading-none text-tan`}>
                &#8383;{standard.prices.full.btc}
              </span>
            </Button>
          ) : (
            standardHref && (
              <Button asChild variant="raised" className={TILE}>
                <a
                  href={standardHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={TILE_LABEL}>Standard</span>
                  <span
                    className={`${HEADING} text-[30px] leading-none text-tan`}
                  >
                    ${standard.prices.full.usd}
                  </span>
                </a>
              </Button>
            )
          ))}
        <Button
          type="button"
          variant="raised"
          id="supporter"
          onClick={() => setSupporterOpen(true)}
          className={`${TILE} scroll-mt-24`}
        >
          <span className={TILE_LABEL}>Supporter</span>
          <span className={`${HEADING} text-[30px] leading-none text-tan`}>
            {isBtc ? (
              <>&#8383;{supporterTier.floor.btc}+</>
            ) : (
              <>${supporterTier.floor.usd}+</>
            )}
          </span>
        </Button>
        {/* Day passes are USD-only, so the tile ignores the currency toggle. */}
        <Button
          type="button"
          variant="raised"
          onClick={() => setDayPassOpen(true)}
          className={TILE}
        >
          <span className={TILE_LABEL}>Day pass</span>
          <span className={`${HEADING} text-[22px] leading-none text-tan`}>
            {dayPasses.map((p) => `$${p.usd}`).join("/")}
          </span>
          <span className={TILE_NOTE}>
            {dayPasses.map((p) => p.date.long.slice(0, 3)).join(" · ")}
          </span>
        </Button>
        {/* Volunteer + financial aid: plain application links, deliberately not
            styled like the purchase tiles. */}
        <div
          className={`w-full text-sm ${start ? "text-left" : "text-center"} ${onDark ? "text-cream/70" : "text-ink/70"} flex flex-col gap-1.5`}
        >
          <span>
            A limited supply of volunteer tickets are available.{" "}
            <a
              href={VOLUNTEER_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-bold underline underline-offset-2 ${onDark ? "text-tan" : "text-meeple"}`}
            >
              Apply to volunteer
            </a>
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
      </div>
      {supporterOpen && <SupporterModal onClose={closeSupporter} />}
      {dayPassOpen && <DayPassModal onClose={() => setDayPassOpen(false)} />}
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
