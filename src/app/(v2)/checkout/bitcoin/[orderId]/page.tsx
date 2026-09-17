"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import ContentPage from "@/v2/components/ContentPage";
import ContactLink from "@/v2/components/contact/ContactLink";
import { Button } from "@/v2/components/ui/button";

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
  const orderSubject = `Bitcoin order ${params.orderId}`;
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
    <ContentPage eyebrow="Ready to play?" title="Bitcoin checkout">
      <div className="flex max-w-[560px] flex-col items-start gap-6 text-base text-ink/80">
        {phase === "loading" && (
          <p className="text-ink/70">Loading your order&hellip;</p>
        )}

        {phase === "pending" && (
          <div className="flex flex-col items-start gap-3">
            <span
              aria-hidden
              className="h-8 w-8 animate-spin rounded-full border-[3px] border-navy/20 border-t-meeple"
            />
            <p className="text-lg text-ink">
              We&rsquo;re confirming your Bitcoin payment&hellip;
            </p>
            <p className="text-sm text-ink/70">
              This page refreshes automatically. It can take a few minutes for
              the network to confirm.
            </p>
          </div>
        )}

        {phase === "paid" && (
          <div className="flex flex-col items-start gap-3">
            <p className="font-grotesk text-2xl font-bold text-navy">
              Payment received!
            </p>
            <p>
              Your Metagame 2026 ticket is confirmed. We&rsquo;ll follow up by
              email with the details.
            </p>
          </div>
        )}

        {phase === "expired" && (
          <div className="flex flex-col items-start gap-3">
            <p>
              This payment expired before it completed. Please head back and
              start a new ticket purchase.
            </p>
            <Button asChild variant="navy" className="mt-1">
              <Link href="/#tickets">Back to tickets</Link>
            </Button>
          </div>
        )}

        {phase === "underpaid" && (
          <div className="flex flex-col items-start gap-3">
            <p className="font-grotesk text-2xl font-bold text-meeple">
              Partial payment received
            </p>
            <p>
              We received a partial payment that didn&rsquo;t cover the full
              ticket price. Please don&rsquo;t send more without contacting us
              first —{" "}
              <ContactLink
                subject={orderSubject}
                className="font-semibold text-navy underline underline-offset-2"
              >
                contact us
              </ContactLink>{" "}
              and we&rsquo;ll sort it out.
            </p>
          </div>
        )}

        {phase === "refunded" && (
          <div className="flex flex-col items-start gap-3">
            <p>
              This payment was refunded. If that wasn&rsquo;t expected,{" "}
              <ContactLink
                subject={orderSubject}
                className="font-semibold text-navy underline underline-offset-2"
              >
                contact us
              </ContactLink>{" "}
              and we&rsquo;ll help.
            </p>
          </div>
        )}

        {phase === "error" && (
          <p className="text-meeple">
            We couldn&rsquo;t load this order&rsquo;s status. If you completed a
            payment, don&rsquo;t pay again — email us and we&rsquo;ll sort it
            out.
          </p>
        )}

        {settled || phase === "error" ? null : (
          <p className="font-space-mono text-xs tracking-wider text-ink/40 uppercase">
            Order {orderId}
          </p>
        )}

        <span className="text-sm">
          Questions?
          <ContactLink
            subject={orderSubject}
            className="ml-2 inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-2"
          >
            <FaEnvelope size={12} aria-hidden className="translate-y-[1px]" />
            Contact us
          </ContactLink>
        </span>
      </div>
    </ContentPage>
  );
}
