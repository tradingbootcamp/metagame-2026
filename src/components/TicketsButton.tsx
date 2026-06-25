"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ticketTiers, ticketUrl } from "@/lib/tickets";
import BtcModal from "./BtcModal";

type Currency = "usd" | "btc";
const CURRENCY_KEY = "ticket-currency";

// Persisted-currency store. The *visible* toggle/prices are driven by the
// html[data-currency] attribute (set before first paint by an inline script in the
// root layout), so the display never flashes USD→BTC on load. This store mirrors
// that value into React for the checkout action + aria state; setCurrency() keeps
// localStorage, the attribute, and subscribers in sync when the user toggles.
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
  if (typeof document !== "undefined") {
    document.documentElement.dataset.currency = next;
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
          {/* Both currency prices are rendered; CSS (keyed on html[data-currency],
              set pre-paint) shows the active one — so the right price paints on load
              with no USD→BTC flash. */}
          <span className="ccy-usd flex items-center gap-2 text-[28px]">
            <span className="text-[#f4ecd2]/45 line-through">${full.usd}</span>
            <span className="text-[#eaa35a]">${earlyBird.usd}</span>
          </span>
          <span className="ccy-btc flex items-center gap-2 text-[28px]">
            <span className="text-[#f4ecd2]/45 line-through">
              &#8383;{full.btc}
            </span>
            <span className="text-[#eaa35a]">&#8383;{earlyBird.btc}</span>
          </span>
        </span>
      </button>

      {/* currency toggle — one click target; clicking anywhere (or Space/Enter)
          flips USD↔BTC. Knob position + label emphasis are CSS-driven off
          html[data-currency], so they paint correct on load (no flash) and animate
          only on a user toggle. */}
      <button
        type="button"
        role="switch"
        aria-checked={isBtc}
        aria-label="Payment currency: USD or BTC"
        onClick={() => setCurrency(isBtc ? "usd" : "btc")}
        className="relative grid grid-cols-2 items-stretch border-[1.5px] border-[#1b1530]/30 font-[family-name:var(--font-bebas)] text-[18px] tracking-[0.08em]"
      >
        {/* sliding knob: covers the USD (left) or BTC (right) half */}
        <span
          aria-hidden
          className="ccy-knob absolute inset-y-0 left-0 w-1/2 bg-[#eaa35a] transition-transform"
        />
        <span className="ccy-label-usd relative px-5 py-1 transition-colors">
          USD
        </span>
        <span className="ccy-label-btc relative px-5 py-1 transition-colors">
          BTC
        </span>
      </button>

      {open && <BtcModal ticket={ticket} onClose={() => setOpen(false)} />}
    </div>
  );
}
