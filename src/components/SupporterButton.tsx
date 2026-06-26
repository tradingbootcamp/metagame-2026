"use client";

import { useEffect, useState } from "react";
import { supporterTier } from "@/lib/tickets";
import SupporterModal from "./SupporterModal";

// The button itself is currency-agnostic: both prices render and CSS (keyed on
// html[data-currency]) shows the active one. The modal reads the currency store.
export default function SupporterButton() {
  const [open, setOpen] = useState(false);

  // Close on Escape; only attach the listener while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const { floor } = supporterTier;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative z-[5] w-full"
      >
        {/* orange box behind the button, revealed on hover */}
        <span aria-hidden className="absolute inset-0 bg-[#eaa35a]" />
        <span className="relative flex min-h-14 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#1b1530] px-7 py-2 font-[family-name:var(--font-bebas)] leading-none tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]">
          <span className="text-[22px]">Supporter Tier</span>
          {/* Both currency prices render; CSS (html[data-currency], set pre-paint)
              shows the active one with no USD→BTC flash. The trailing "+" signals
              pay-what-you-want above the floor. */}
          <span className="ccy-usd flex items-center text-[28px] text-[#eaa35a]">
            ${floor.usd}+
          </span>
          <span className="ccy-btc flex items-center text-[28px] text-[#eaa35a]">
            &#8383;{floor.btc}+
          </span>
        </span>
      </button>

      {open && <SupporterModal onClose={() => setOpen(false)} />}
    </>
  );
}
