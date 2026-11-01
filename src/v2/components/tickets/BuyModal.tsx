"use client";

import { useState } from "react";
import { FAMILY_PACK } from "@/lib/family-pack";
import {
  REFERRAL_CODE_LENGTH,
  REFERRAL_PARAM,
  normalizeReferralCode,
} from "@/lib/referral";
import { PROMO_PARAM } from "@/lib/tracking-links";
import { readPromo, withUtm } from "@/lib/utm";
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

const FIELD_LABEL =
  "font-space-mono text-[12px] tracking-[0.12em] text-cream/70 uppercase";

function initialCodes(): { ref: string; promo: string } {
  if (typeof window === "undefined") return { ref: "", promo: "" };
  const params = new URLSearchParams(window.location.search);
  return { ref: params.get(REFERRAL_PARAM) ?? "", promo: readPromo() };
}

/**
 * The stop before Stripe for a Standard ticket with a referral code, opened by
 * "Use a referral code" and /invite/<ref> links. Checkout applies the bigger of
 * the referral and the discount code, and records the referral either way.
 */
export default function BuyModal({ onClose }: { onClose: () => void }) {
  const [codes, setCodes] = useState(initialCodes);
  const [busy, setBusy] = useState(false);

  const ref = normalizeReferralCode(codes.ref);
  const promo = codes.promo.trim();
  const refShort = ref.length > 0 && ref.length !== REFERRAL_CODE_LENGTH;

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
        <DialogTitle className={`${HEADING} pr-6 text-[clamp(24px,6vw,30px)]`}>
          Standard ticket
        </DialogTitle>
        <DialogDescription className="text-base text-cream/80">
          A friend&apos;s referral code gets you a Standard ticket for $
          {FAMILY_PACK.usd}, and you both get the bring-a-friend swag.
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
            {refShort && (
              <span className="text-sm text-cream/70">
                Referral codes are {REFERRAL_CODE_LENGTH} characters.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Other discount code</span>
            <Input
              value={codes.promo}
              onChange={(e) =>
                setCodes((c) => ({ ...c, promo: e.target.value }))
              }
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              disabled={busy}
              className="font-mono"
            />
          </label>

          <p className="text-sm text-cream/80">The biggest discount applies.</p>

          <Button
            type="submit"
            disabled={busy || refShort}
            className="h-12 w-full text-base"
          >
            {busy ? "Opening checkout…" : "Continue to checkout"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
