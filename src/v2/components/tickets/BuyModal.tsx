"use client";

import { useEffect, useState } from "react";
import { STANDARD_USD } from "@/lib/family-pack";
import {
  REFERRAL_CODE_LENGTH,
  REFERRAL_PARAM,
  referralCodeOf,
  normalizeReferralCode,
} from "@/lib/referral";
import { PROMO_PARAM, promoCode } from "@/lib/tracking-links";
import { readPromo, readReferral, withUtm } from "@/lib/utm";
import { stripeCheckoutHref } from "@/v2/lib/tickets";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import { HEADING } from "../styles";

// What /api/checkout/stripe/preview reports for the codes as typed.
type Preview = {
  full: number;
  ref: {
    entered: boolean;
    valid: boolean;
    name: string | null;
    usdOff: number | null;
  };
  promo: {
    entered: boolean;
    valid: boolean;
    unavailable: boolean;
    code: string | null;
    label: string | null;
    usdOff: number | null;
  };
  applied: "promo" | "referral" | null;
  usdOff: number;
  usdPay: number;
};

const FIELD_LABEL =
  "font-space-mono text-[12px] tracking-[0.12em] text-cream/70 uppercase";

/** The code a link carried, else the one a past link stored. */
function initialCodes(): { ref: string; promo: string } {
  if (typeof window === "undefined") return { ref: "", promo: "" };
  const params = new URLSearchParams(window.location.search);
  return {
    ref: referralCodeOf(params.get(REFERRAL_PARAM)) || readReferral(),
    promo: promoCode(params.get(PROMO_PARAM)) || readPromo(),
  };
}

/**
 * The stop before Stripe for a Standard ticket: a referral code and a
 * discount code, with the price they'll get. Stripe locks in whichever
 * discount is bigger, and the referral is recorded either way. Opened from
 * the Standard tile and by /buy, /buy/<code> and /invite/<ref> links.
 */
export default function BuyModal({ onClose }: { onClose: () => void }) {
  const [codes, setCodes] = useState(initialCodes);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  const ref = normalizeReferralCode(codes.ref);
  const promo = codes.promo.trim();
  const refShort = ref.length > 0 && ref.length !== REFERRAL_CODE_LENGTH;

  // Debounced so the price follows the typing; checkout resolves it again.
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => {
      setChecking(true);
      fetch("/api/checkout/stripe/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, promo }),
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d: Preview) => {
          setPreview(d);
          setChecking(false);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setChecking(false);
        });
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [ref, promo]);

  const full = preview?.full ?? STANDARD_USD;
  const pay = preview?.usdPay ?? full;
  const settled = preview !== null && !checking;

  function checkout() {
    setBusy(true);
    const url = new URL(
      stripeCheckoutHref({ tier: "standard", code: "own" }),
      window.location.origin,
    );
    if (ref) url.searchParams.set(REFERRAL_PARAM, ref);
    if (promo) url.searchParams.set(PROMO_PARAM, promo);
    window.location.assign(withUtm(url.pathname + url.search));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="flex max-w-[460px] flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-2 pr-6">
          <DialogTitle className={`${HEADING} text-[clamp(24px,6vw,30px)]`}>
            Standard ticket
          </DialogTitle>
          <span className="flex items-center gap-2 text-lg">
            {pay < full && (
              <span className="text-cream/45 line-through">${full}</span>
            )}
            <span className="font-semibold text-tan">${pay}</span>
          </span>
        </div>
        <DialogDescription className="text-base text-cream/80">
          Full weekend admission. Got a code from a friend, or a discount code?
          Enter it here before checkout.
        </DialogDescription>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            checkout();
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Referral code</span>
            <Input
              value={codes.ref}
              onChange={(e) =>
                setCodes((c) => ({ ...c, ref: e.target.value.toUpperCase() }))
              }
              placeholder="ABCD-EFGH"
              autoComplete="off"
              spellCheck={false}
              maxLength={REFERRAL_CODE_LENGTH + 3}
              disabled={busy}
              className="font-mono"
            />
            <span className="min-h-5 text-sm text-cream/70">
              {refShort
                ? `Referral codes are ${REFERRAL_CODE_LENGTH} characters.`
                : !ref
                  ? "From a friend's ticket page. You pay the Family & Friends price and you both get the bring-a-friend swag."
                  : settled && preview.ref.valid
                    ? `Referral from ${preview.ref.name ?? "a friend"} recorded${preview.ref.usdOff ? ` — $${preview.ref.usdOff} off` : ""}.`
                    : settled
                      ? "We don't recognize that referral code."
                      : "Checking…"}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Discount code</span>
            <Input
              value={codes.promo}
              onChange={(e) =>
                setCodes((c) => ({ ...c, promo: e.target.value }))
              }
              placeholder="Student, aid, comp or other code"
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              disabled={busy}
              className="font-mono"
            />
            <span className="min-h-5 text-sm text-cream/70">
              {!promo
                ? "Optional. If it beats the referral price, it applies instead; the referral still counts."
                : settled && preview.promo.valid
                  ? `${preview.promo.code}: $${preview.promo.usdOff ?? 0} off${preview.promo.label ? ` (${preview.promo.label})` : ""}.`
                  : settled && preview.promo.unavailable
                    ? "We'll check this code at checkout."
                    : settled
                      ? "That code isn't active."
                      : "Checking…"}
            </span>
          </label>

          {settled && (
            <p className="text-sm text-cream/80">
              {preview.applied === "promo"
                ? `Your discount code applies: $${preview.usdOff} off.`
                : preview.applied === "referral"
                  ? `Referral price applies: $${preview.usdOff} off.`
                  : "No discount applied yet. You can also enter a code at checkout."}
            </p>
          )}

          <Button
            type="submit"
            disabled={busy || refShort}
            className="h-12 w-full text-base"
          >
            {busy ? "Opening checkout…" : `Continue to checkout · $${pay}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
