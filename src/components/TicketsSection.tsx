"use client";

import { useSyncExternalStore } from "react";
import {
  subscribeCurrency,
  getCurrencySnapshot,
  getCurrencyServerSnapshot,
  setCurrency,
} from "@/lib/currency-store";
import TicketsButton from "./TicketsButton";
import SupporterButton from "./SupporterButton";

// Owns the single currency toggle that governs every ticket button below it
// (standard + supporter). The buttons read the same store, so one toggle flips
// the price display and checkout path for both.
export default function TicketsSection() {
  const currency = useSyncExternalStore(
    subscribeCurrency,
    getCurrencySnapshot,
    getCurrencyServerSnapshot,
  );
  const isBtc = currency === "btc";

  return (
    <div className="flex w-full max-w-[440px] flex-col items-center gap-2">
      <TicketsButton />
      <SupporterButton />

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
    </div>
  );
}
