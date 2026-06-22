"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaEnvelope } from "react-icons/fa";

// OpenNode charge lifecycle, narrowed to what we surface here.
type Phase =
  | "loading"
  | "pending"
  | "paid"
  | "underpaid"
  | "expired"
  | "refunded"
  | "error";

function phaseFor(status: string | null): Phase {
  switch (status) {
    case "paid":
      return "paid";
    case "processing":
      return "pending";
    case "underpaid":
      return "underpaid";
    case "expired":
      return "expired";
    case "refunded":
      return "refunded";
    case null:
      return "error";
    default:
      // unpaid / anything else → still waiting.
      return "pending";
  }
}

export default function BitcoinCheckoutPage() {
  const params = useParams<{ orderId: string }>();
  const search = useSearchParams();
  const orderId = params.orderId;

  // Charge id comes from the ?charge= query if present; otherwise from the
  // localStorage stash the modal wrote (keyed on orderId) before redirect. Lazy
  // init reads localStorage once on mount (it's client-only, so guarded).
  const [chargeId] = useState<string | null>(() => {
    const fromQuery = search.get("charge");
    if (fromQuery) return fromQuery;
    try {
      return localStorage.getItem(`btc-charge:${orderId}`);
    } catch {
      return null;
    }
  });
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    if (!chargeId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/checkout/opennode/status?id=${encodeURIComponent(chargeId!)}`,
        );
        if (!res.ok) throw new Error("status request failed");
        const { status } = (await res.json()) as { status: string | null };
        if (!cancelled) setPhase(phaseFor(status));
      } catch {
        if (!cancelled) setPhase("error");
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chargeId]);

  const settled =
    phase === "paid" ||
    phase === "expired" ||
    phase === "underpaid" ||
    phase === "refunded";

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center bg-[#fff5e4] px-[clamp(20px,5vw,56px)] py-[clamp(24px,4vh,48px)] font-[family-name:var(--font-space-grotesk)] text-[#1b1530]">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-6">
        <h1 className="text-center font-[family-name:var(--font-bebas)] text-[clamp(34px,8vw,56px)] leading-[0.9] tracking-[0.03em]">
          Bitcoin Checkout
        </h1>

        {phase === "loading" && (
          <p className="text-center text-base text-[#1b1530]/70">
            Loading your order&hellip;
          </p>
        )}

        {phase === "pending" && (
          <div className="flex flex-col items-center gap-3">
            <span
              aria-hidden
              className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#1b1530]/20 border-t-[#eaa35a]"
            />
            <p className="text-center text-lg">
              We&rsquo;re confirming your Bitcoin payment&hellip;
            </p>
            <p className="text-center text-sm text-[#1b1530]/70">
              This page refreshes automatically. It can take a few minutes for
              the network to confirm.
            </p>
          </div>
        )}

        {phase === "paid" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center font-[family-name:var(--font-bebas)] text-[28px] tracking-[0.04em] text-[#eaa35a]">
              Payment received!
            </p>
            <p className="text-center text-base">
              Your Metagame 2026 ticket is confirmed. We&rsquo;ll follow up by
              email with the details.
            </p>
          </div>
        )}

        {phase === "expired" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-base">
              This payment expired before it completed. Please head back and
              start a new ticket purchase.
            </p>
            <Link href="/" className="group relative mt-1 inline-block">
              <span aria-hidden className="absolute inset-0 bg-[#eaa35a]" />
              <span className="relative flex h-12 items-center justify-center bg-[#1b1530] px-7 font-[family-name:var(--font-bebas)] text-xl tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]">
                Back to tickets
              </span>
            </Link>
          </div>
        )}

        {phase === "underpaid" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center font-[family-name:var(--font-bebas)] text-[28px] tracking-[0.04em] text-[#c0392b]">
              Partial payment received
            </p>
            <p className="text-center text-base">
              We received a partial payment that didn&rsquo;t cover the full
              ticket price. Please don&rsquo;t send more without contacting us
              first — email{" "}
              <a href="mailto:team@metagame.games" className="underline">
                team@metagame.games
              </a>{" "}
              and we&rsquo;ll sort it out.
            </p>
          </div>
        )}

        {phase === "refunded" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-base">
              This payment was refunded. If that wasn&rsquo;t expected, email{" "}
              <a href="mailto:team@metagame.games" className="underline">
                team@metagame.games
              </a>{" "}
              and we&rsquo;ll help.
            </p>
          </div>
        )}

        {phase === "error" && (
          <p className="text-center text-base text-[#c0392b]">
            We couldn&rsquo;t load this order&rsquo;s status. If you completed a
            payment, don&rsquo;t pay again — email us and we&rsquo;ll sort it
            out.
          </p>
        )}

        {settled || phase === "error" ? null : (
          <p className="text-center text-xs tracking-wider text-[#1b1530]/40 uppercase">
            Order {orderId}
          </p>
        )}

        <span className="text-center text-sm">
          Questions?
          <a
            href="mailto:team@metagame.games"
            className="ml-2 inline-flex items-center gap-1 underline"
          >
            <FaEnvelope size={12} aria-hidden className="translate-y-[1px]" />
            team@metagame.games
          </a>
        </span>
      </div>
    </main>
  );
}
