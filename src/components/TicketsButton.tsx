"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ticketTiers, ticketUrl } from "@/lib/tickets";
import BtcModal from "./BtcModal";

type Currency = "usd" | "btc";
const CURRENCY_KEY = "ticket-currency";

// Persisted-currency external store. useSyncExternalStore reads localStorage with a
// distinct server snapshot ("usd"), so SSR and the first client paint agree and there's
// no hydration mismatch on the toggle — then it reconciles to the saved value. Writes go
// through setCurrency(), which persists and notifies subscribers so the UI re-renders.
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

function getCurrencyServerSnapshot(): Currency {
  return "usd";
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
          <span className="flex items-center gap-2 text-[28px]">
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

      {/* currency toggle, sitting just below the button */}
      <div
        role="radiogroup"
        aria-label="Payment currency"
        className="flex items-stretch border-[1.5px] border-[#1b1530]/30 font-[family-name:var(--font-bebas)] text-[18px] tracking-[0.08em]"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!isBtc}
          onClick={() => setCurrency("usd")}
          className={`px-5 py-1 transition-colors ${
            !isBtc
              ? "bg-[#eaa35a] text-[#1b1530]"
              : "bg-transparent text-[#1b1530]/60 hover:text-[#1b1530]"
          }`}
        >
          USD
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isBtc}
          onClick={() => setCurrency("btc")}
          className={`px-5 py-1 transition-colors ${
            isBtc
              ? "bg-[#eaa35a] text-[#1b1530]"
              : "bg-transparent text-[#1b1530]/60 hover:text-[#1b1530]"
          }`}
        >
          BTC
        </button>
      </div>

      {open && <BtcModal ticket={ticket} onClose={() => setOpen(false)} />}
    </div>
  );
}
