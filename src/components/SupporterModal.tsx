"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { FaBitcoin, FaTimes } from "react-icons/fa";
import { supporterTier, supporterChipUrl } from "@/lib/tickets";
import {
  subscribeCurrency,
  getCurrencySnapshot,
  getCurrencyServerSnapshot,
} from "@/lib/currency-store";

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

export default function SupporterModal({ onClose }: { onClose: () => void }) {
  const { floor, defaultChipUsd, chips } = supporterTier;
  const titleId = useId();
  const currency = useSyncExternalStore(
    subscribeCurrency,
    getCurrencySnapshot,
    getCurrencyServerSnapshot,
  );
  const isBtc = currency === "btc";

  const defaultIndex = Math.max(
    0,
    chips.findIndex((c) => c.usd === defaultChipUsd),
  );
  const [selected, setSelected] = useState(defaultIndex);
  const chip = chips[selected];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [discord, setDiscord] = useState("");
  // BTC-mode editable amount, prefilled from the selected chip. Kept as a string so
  // the field can be mid-edit; parsed on validation/submit.
  const [btcAmount, setBtcAmount] = useState(String(chip.btc));
  // Debounced "below floor" warning — polite, not instant yelling (mirrors BtcModal).
  const [belowFloor, setBelowFloor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Clicking a chip selects it and (BTC mode) sets the editable amount to its value.
  function pickChip(i: number) {
    setSelected(i);
    setBtcAmount(String(chips[i].btc));
    setBelowFloor(false);
  }

  // Debounced floor check so the red note appears a beat after the user stops typing.
  useEffect(() => {
    const t = setTimeout(() => {
      const n = Number(btcAmount);
      setBelowFloor(btcAmount.trim() !== "" && (!isFinite(n) || n < floor.btc));
    }, 400);
    return () => clearTimeout(t);
  }, [btcAmount, floor.btc]);

  const stripeHref = supporterChipUrl(chip);

  async function payWithBtc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const amount = Number(btcAmount);
    if (!isFinite(amount) || amount < floor.btc) {
      return setError(`Minimum is ₿${floor.btc}.`);
    }
    if (!name.trim()) return setError("Please enter your name.");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/opennode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: supporterTier.id,
          name,
          email,
          // Optional — only send a non-empty handle.
          ...(discord.trim() ? { discord: discord.trim() } : {}),
          // Server re-validates this is ≥ floor before charging.
          btc: amount,
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

  function checkoutAtStripe() {
    if (stripeHref) {
      window.open(stripeHref, "_blank", "noopener,noreferrer");
    }
  }

  // Quick-pick amount chips — placed differently per mode (USD: above the copy;
  // BTC: below the editable amount input it populates), so defined once here.
  const chipRow = (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => {
        const active = i === selected;
        return (
          <button
            key={c.usd}
            type="button"
            aria-pressed={active}
            onClick={() => pickChip(i)}
            className={`border-[1.5px] px-4 py-2 font-[family-name:var(--font-bebas)] text-lg tracking-[0.06em] transition-colors ${
              active
                ? "border-[#1b1530] bg-[#1b1530] text-[#f4ecd2]"
                : "border-[#1b1530]/35 text-[#1b1530] hover:border-[#eaa35a]"
            }`}
          >
            {isBtc ? <>&#8383;{c.btc}</> : <>${c.usd}</>}
          </button>
        );
      })}
    </div>
  );

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
      <div className="relative flex w-full max-w-[460px] flex-col gap-5 bg-[#fff5e4] p-6 text-[#1b1530] shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center text-[#1b1530]/50 transition-colors hover:text-[#1b1530]"
        >
          <FaTimes size={18} />
        </button>

        <div className="flex flex-col gap-1 pr-6">
          <h2
            id={titleId}
            className="flex items-center gap-2 font-[family-name:var(--font-bebas)] text-[clamp(26px,6vw,34px)] leading-tight tracking-[0.04em]"
          >
            {isBtc && <FaBitcoin aria-hidden className="text-[#eaa35a]" />}
            Supporter Tier
          </h2>
          {!isBtc && (
            <p className="text-base text-[#1b1530]/80">
              Help make Metagame 2026 even better!
            </p>
          )}
        </div>

        {isBtc ? (
          <form onSubmit={payWithBtc} className="flex flex-col gap-3">
            <p className="text-sm text-[#1b1530]/75">
              Help make Metagame 2026 even better! Pay-what-you-want,
              &ge;&#8383;{floor.btc}. There may be benefits/perks for
              Supporters, but we haven&rsquo;t decided if/what those might be
              yet. If you&rsquo;re interested in a more formal sponsorship,
              reach out to{" "}
              <a
                href="mailto:team@metagame.games"
                className="underline transition-colors hover:text-[#eaa35a]"
              >
                team@metagame.games
              </a>
              .
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-xs tracking-wide text-[#1b1530]/60 uppercase">
                Amount (BTC)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.0001"
                min={floor.btc}
                value={btcAmount}
                onChange={(e) => setBtcAmount(e.target.value)}
                aria-label="BTC amount"
                className={FIELD}
              />
              {belowFloor && (
                <p className="text-xs text-[#c0392b]">
                  Minimum is &#8383;{floor.btc}.
                </p>
              )}
            </div>
            {chipRow}
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
        ) : (
          <div className="flex flex-col gap-3">
            {chipRow}
            <p className="text-xs text-[#1b1530]/55">
              You can set any custom amount &ge;$525 at the Stripe checkout
              page.
            </p>
            <p className="text-sm text-[#1b1530]/75">
              Interested in a formal sponsorship? Reach out to{" "}
              <a
                href="mailto:team@metagame.games"
                className="underline transition-colors hover:text-[#eaa35a]"
              >
                team@metagame.games
              </a>
              !
            </p>
            <button
              type="button"
              onClick={checkoutAtStripe}
              className="group relative"
            >
              <span aria-hidden className="absolute inset-0 bg-[#eaa35a]" />
              <span className="relative flex h-12 items-center justify-center bg-[#1b1530] px-7 font-[family-name:var(--font-bebas)] text-xl tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]">
                Checkout at Stripe
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
