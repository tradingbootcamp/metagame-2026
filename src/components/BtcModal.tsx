"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FaBitcoin, FaTimes } from "react-icons/fa";
import type { TicketTier } from "@/lib/tickets";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Defensive client-side guard: never navigate to a non-OpenNode host even if the
// API response is tampered with. The server already validates, this is belt-and-suspenders.
function isOpenNodeCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "checkout.opennode.com" || host.endsWith(".opennode.com");
  } catch {
    return false;
  }
}

const FIELD =
  "h-12 w-full border-[1.5px] border-[#1b1530]/35 bg-[#f4ecd2] px-4 text-base text-[#1b1530] outline-none transition-colors placeholder:text-[#1b1530]/40 focus:border-[#eaa35a]";

// Mirrors the server cap so over-long input fails fast in the browser too.
const MAX_FIELD_LEN = 200;

export default function BtcModal({
  ticket,
  onClose,
}: {
  ticket: TicketTier;
  onClose: () => void;
}) {
  const { full } = ticket.prices;
  const titleId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [discord, setDiscord] = useState("");
  // Prefilled with the advertised early-bird code; validated live against the server.
  const [discountCode, setDiscountCode] = useState("EARLYBIRD");
  const [codeState, setCodeState] = useState<{
    validating: boolean;
    valid: boolean;
    btcPrice: number | null;
    label?: string;
  }>({ validating: true, valid: false, btcPrice: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Live-validate the discount code (on mount + on change, debounced) so the
  // displayed price reflects what the server would actually charge. The charge
  // itself is re-derived server-side — this is display-only.
  useEffect(() => {
    const code = discountCode.trim();
    const controller = new AbortController();
    // setState is deferred into the timer (not run synchronously in the effect
    // body) so the new-Next react-hooks linter doesn't flag a cascading render.
    const t = setTimeout(() => {
      if (!code) {
        setCodeState({ validating: false, valid: false, btcPrice: null });
        return;
      }
      setCodeState((s) => ({ ...s, validating: true }));
      fetch("/api/checkout/opennode/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, code }),
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) =>
          setCodeState({
            validating: false,
            valid: Boolean(d.valid),
            btcPrice: typeof d.btcPrice === "number" ? d.btcPrice : null,
            label: d.label,
          }),
        )
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setCodeState({ validating: false, valid: false, btcPrice: null });
        });
    }, 400);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [discountCode, ticket.id]);

  const codeEmpty = !discountCode.trim();
  const discounted = codeState.valid && codeState.btcPrice != null;
  const codeInvalid = !codeEmpty && !codeState.validating && !codeState.valid;

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
        body: JSON.stringify({
          ticketId: ticket.id,
          name,
          email,
          // Optional — only send a non-empty handle.
          ...(discord.trim() ? { discord: discord.trim() } : {}),
          // Server re-validates and re-derives the price; an invalid code just
          // falls through to full price.
          ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.hostedCheckoutUrl) {
        throw new Error(data.error || "Could not start Bitcoin checkout.");
      }
      if (!isOpenNodeCheckoutUrl(data.hostedCheckoutUrl)) {
        throw new Error("Could not start Bitcoin checkout.");
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

        <div className="flex items-center justify-between gap-2 pr-6">
          <h2
            id={titleId}
            className="flex items-center gap-2 font-[family-name:var(--font-bebas)] text-[clamp(26px,6vw,34px)] leading-tight tracking-[0.04em]"
          >
            <FaBitcoin aria-hidden className="text-[#eaa35a]" /> Pay with BTC
          </h2>
          <span className="flex items-center gap-2 text-lg">
            {discounted ? (
              <>
                <span className="text-[#1b1530]/45 line-through">
                  &#8383;{full.btc}
                </span>
                <span className="font-semibold text-[#eaa35a]">
                  &#8383;{codeState.btcPrice}
                </span>
              </>
            ) : (
              <span className="font-semibold text-[#eaa35a]">
                &#8383;{full.btc}
              </span>
            )}
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
            maxLength={MAX_FIELD_LEN}
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
            maxLength={MAX_FIELD_LEN}
            required
            className={FIELD}
          />
          <input
            type="text"
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
            placeholder="Discord handle (optional)"
            aria-label="Discord handle (optional)"
            maxLength={MAX_FIELD_LEN}
            className={FIELD}
          />
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Discount code (optional)"
              aria-label="Discount code"
              autoCapitalize="characters"
              maxLength={MAX_FIELD_LEN}
              className={FIELD}
            />
            {discounted && (
              <p className="text-xs text-[#1b1530]/60">
                {codeState.label ?? "Discount applied"}
              </p>
            )}
            {codeInvalid && (
              <p className="text-xs text-[#1b1530]/60">Code not found</p>
            )}
          </div>
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
      </div>
    </div>
  );
}
