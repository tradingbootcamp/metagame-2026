"use client";

import { useId, useRef, useState } from "react";
import { FaBitcoin, FaCreditCard, FaTimes } from "react-icons/fa";
import type { TicketTier } from "@/lib/tickets";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD =
  "h-12 w-full border-[1.5px] border-[#1b1530]/35 bg-[#f4ecd2] px-4 text-base text-[#1b1530] outline-none transition-colors placeholder:text-[#1b1530]/40 focus:border-[#eaa35a]";

export default function TicketModal({
  ticket,
  stripeHref,
  onClose,
}: {
  ticket: TicketTier;
  stripeHref: string;
  onClose: () => void;
}) {
  const { full, earlyBird } = ticket.prices;
  const titleId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  async function payWithBtc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/opennode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, name, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.hostedCheckoutUrl) {
        throw new Error(data.error || "Could not start Bitcoin checkout.");
      }
      // Stash the charge id so the return page can poll status (no DB to look it up).
      try {
        if (data.orderId && data.chargeId) {
          localStorage.setItem(`btc-charge:${data.orderId}`, data.chargeId);
        }
      } catch {
        // localStorage unavailable — page falls back to the ?charge= query.
      }
      window.location.href = data.hostedCheckoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1b1530]/70 p-4 font-[family-name:var(--font-space-grotesk)]"
    >
      <div className="relative flex w-full max-w-[460px] flex-col gap-6 bg-[#fff5e4] p-6 text-[#1b1530] shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center text-[#1b1530]/50 transition-colors hover:text-[#1b1530]"
        >
          <FaTimes size={18} />
        </button>

        <h2
          id={titleId}
          className="font-[family-name:var(--font-bebas)] text-[clamp(26px,6vw,34px)] leading-tight tracking-[0.04em]"
        >
          Get your {ticket.label} ticket
        </h2>

        {/* Pay with card (Stripe) */}
        <section className="flex flex-col gap-3 border-[1.5px] border-[#1b1530]/15 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-[family-name:var(--font-bebas)] text-xl tracking-[0.06em]">
              <FaCreditCard aria-hidden /> Pay with card
            </span>
            <span className="flex items-center gap-2 text-lg">
              <span className="text-[#1b1530]/45 line-through">
                ${full.usd}
              </span>
              <span className="font-semibold text-[#1b1530]">
                ${earlyBird.usd}
              </span>
            </span>
          </div>
          <a
            href={stripeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-block"
          >
            <span aria-hidden className="absolute inset-0 bg-[#2b9bf0]" />
            <span className="relative flex h-12 items-center justify-center bg-[#1b1530] px-7 font-[family-name:var(--font-bebas)] text-xl tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]">
              Continue to card checkout
            </span>
          </a>
        </section>

        {/* Pay with BTC */}
        <section className="flex flex-col gap-3 border-[1.5px] border-[#1b1530]/15 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-[family-name:var(--font-bebas)] text-xl tracking-[0.06em]">
              <FaBitcoin aria-hidden className="text-[#eaa35a]" /> Pay with BTC
            </span>
            <span className="flex items-center gap-2 text-lg">
              <span className="text-[#1b1530]/45 line-through">
                &#8383;{full.btc}
              </span>
              <span className="font-semibold text-[#eaa35a]">
                &#8383;{earlyBird.btc}
              </span>
            </span>
          </div>

          <form onSubmit={payWithBtc} className="flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name*"
              aria-label="Name"
              autoComplete="name"
              required
              className={FIELD}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com*"
              aria-label="Email address"
              autoComplete="email"
              required
              className={FIELD}
            />
            {error && <p className="text-sm text-[#c0392b]">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="group relative disabled:opacity-60"
            >
              <span aria-hidden className="absolute inset-0 bg-[#eaa35a]" />
              <span className="relative flex h-12 items-center justify-center bg-[#1b1530] px-7 font-[family-name:var(--font-bebas)] text-xl tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px] group-disabled:translate-x-0! group-disabled:translate-y-0!">
                {submitting ? "Starting checkout…" : "Pay with BTC"}
              </span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
