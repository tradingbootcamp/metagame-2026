"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ticketTiers, ticketUrl } from "@/lib/tickets";
import BtcModal from "./BtcModal";

type Currency = "usd" | "btc";
const CURRENCY_KEY = "ticket-currency";

// Persisted-currency external store. The server / first-paint snapshot is `null`
// (pending) rather than a real currency, so SSR never commits to USD or BTC — the
// price renders as a layout-reserving placeholder until the client resolves the
// saved value. This avoids the USD→BTC flip a returning BTC user would otherwise
// see. Writes go through setCurrency(), which persists and notifies subscribers.
const currencyListeners = new Set<() => void>();

function subscribeCurrency(onChange: () => void): () => void {
  currencyListeners.add(onChange);
  return () => currencyListeners.delete(onChange);
}

function getCurrencySnapshot(): Currency {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (saved === "btc" || saved === "usd") return saved;
  } catch {
    // localStorage unavailable — fall through to the USD default.
  }
  return "usd";
}

// Sentinel for server render + the hydration pass: no currency is chosen yet.
function getCurrencyServerSnapshot(): Currency | null {
  return null;
}

function setCurrency(next: Currency) {
  try {
    localStorage.setItem(CURRENCY_KEY, next);
  } catch {
    // best-effort persistence
  }
  currencyListeners.forEach((fn) => fn());
}

export default function TicketsButton() {
  const ticket = ticketTiers.find((t) => t.id === "standard");
  // null until a Payment Link is configured for the active Stripe mode → CTA stays hidden.
  const stripeHref = ticket ? ticketUrl(ticket) : null;
  const [open, setOpen] = useState(false);
  const currency = useSyncExternalStore(
    subscribeCurrency,
    getCurrencySnapshot,
    getCurrencyServerSnapshot,
  );

  // Close on Escape; only attach the listener while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!ticket || !stripeHref) return null;

  const { full, earlyBird } = ticket.prices;
  // currency is null on the server + first client paint (sentinel); treat it as
  // USD for behavior, but hide the price text until it resolves so no wrong-
  // currency value flashes.
  const pending = currency === null;
  const isBtc = currency === "btc";

  // USD → straight to the Stripe Payment Link in a new tab; BTC → BTC-only modal.
  function onCheckout() {
    if (isBtc) {
      setOpen(true);
    } else {
      window.open(stripeHref!, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex w-full max-w-[440px] flex-col items-center gap-2">
      <button
        type="button"
        onClick={onCheckout}
        className="group relative z-[5] w-full"
      >
        {/* orange box behind the button, revealed on hover (set apart from the blue Notify-me CTA) */}
        <span aria-hidden className="absolute inset-0 bg-[#eaa35a]" />
        <span className="relative flex min-h-14 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#1b1530] px-7 py-2 font-[family-name:var(--font-bebas)] leading-none tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]">
          <span className="flex items-center gap-2 text-[22px]">
            <span>Early-Bird Tickets</span>
            {/* "now on sale" badge */}
            <span className="bg-[#eaa35a] px-2 py-[2px] text-[15px] tracking-[0.18em] text-[#1b1530]">
              LIVE
            </span>
          </span>
          {/* While the stored currency is still pending (server + first paint),
              the prices render with visibility:hidden — width/height stays
              reserved so resolving to USD or BTC doesn't shift layout, and no
              wrong-currency value is ever shown. */}
          <span
            className="flex items-center gap-2 text-[28px]"
            style={pending ? { visibility: "hidden" } : undefined}
          >
            {/* full price struck through, early-bird price in the accent orange */}
            <span className="text-[#f4ecd2]/45 line-through">
              {isBtc ? `₿${full.btc}` : `$${full.usd}`}
            </span>
            <span className="text-[#eaa35a]">
              {isBtc ? `₿${earlyBird.btc}` : `$${earlyBird.usd}`}
            </span>
          </span>
        </span>
      </button>

      {/* currency toggle, sitting just below the button — one click target;
          clicking anywhere (or Space/Enter) flips USD↔BTC. A sliding knob in the
          accent orange sits under the active side. */}
      <button
        type="button"
        role="switch"
        aria-checked={isBtc}
        aria-label="Payment currency: USD or BTC"
        onClick={() => setCurrency(isBtc ? "usd" : "btc")}
        className="relative grid grid-cols-2 items-stretch border-[1.5px] border-[#1b1530]/30 font-[family-name:var(--font-bebas)] text-[18px] tracking-[0.08em]"
      >
        {/* sliding knob: covers the left (USD) or right (BTC) half */}
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1/2 bg-[#eaa35a] transition-transform ${
            isBtc ? "translate-x-full" : "translate-x-0"
          }`}
        />
        <span
          className={`relative px-5 py-1 transition-colors ${
            !isBtc ? "text-[#1b1530]" : "text-[#1b1530]/60"
          }`}
        >
          USD
        </span>
        <span
          className={`relative px-5 py-1 transition-colors ${
            isBtc ? "text-[#1b1530]" : "text-[#1b1530]/60"
          }`}
        >
          BTC
        </span>
      </button>

      {open && <BtcModal ticket={ticket} onClose={() => setOpen(false)} />}
    </div>
  );
}
