"use client";

import { useEffect, useState } from "react";
import { ticketTiers, ticketUrl } from "@/lib/tickets";
import TicketModal from "./TicketModal";

export default function TicketsButton() {
  const ticket = ticketTiers.find((t) => t.id === "standard");
  // null until a Payment Link is configured for the active Stripe mode → CTA stays hidden.
  const stripeHref = ticket ? ticketUrl(ticket) : null;
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

  if (!ticket || !stripeHref) return null;

  const { full, earlyBird } = ticket.prices;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative z-[5] w-full max-w-[440px]"
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
            <span className="text-[#f4ecd2]/45 line-through">${full.usd}</span>
            <span className="text-[#eaa35a]">${earlyBird.usd}</span>
          </span>
        </span>
      </button>

      {open && (
        <TicketModal
          ticket={ticket}
          stripeHref={stripeHref}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
