"use client";

import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FAMILY_PACK, STANDARD_USD } from "@/lib/family-pack";
import { readUtm } from "@/lib/utm";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import { HEADING } from "../styles";

const QUANTITIES = Array.from(
  { length: FAMILY_PACK.max - FAMILY_PACK.min + 1 },
  (_, i) => FAMILY_PACK.min + i,
);

export default function FamilyPackModal({ onClose }: { onClose: () => void }) {
  const [quantity, setQuantity] = useState<number>(FAMILY_PACK.min);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = (quantity * FAMILY_PACK.usd).toLocaleString();
  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const attendees = Array.from({ length: quantity }, (_, i) => ({
      name: fields.get(`name_${i}`),
      email: fields.get(`email_${i}`),
    }));
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout/family-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendees, ...readUtm() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start checkout.");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw new Error("Couldn't start checkout.");
      window.location.assign(url.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout.");
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-[520px] flex-col gap-5 overflow-y-auto p-6 sm:p-8">
        <div className="flex flex-col gap-1 pr-6">
          <DialogTitle className={`${HEADING} text-[clamp(24px,6vw,30px)]`}>
            Family &amp; Friends Pack
          </DialogTitle>
          <DialogDescription className="text-base text-cream/80">
            {FAMILY_PACK.min}-to-{FAMILY_PACK.max}-ticket bundle for{" "}
            <span className="text-cream/45 line-through">${STANDARD_USD}</span>{" "}
            <span className="text-tan">${FAMILY_PACK.usd}</span> each
          </DialogDescription>
        </div>
        <form onSubmit={checkout} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="relative">
              <select
                disabled={busy}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                aria-label="Number of tickets"
                className="appearance-none rounded border border-cream/30 bg-navy py-2 pr-9 pl-3 text-cream"
              >
                {QUANTITIES.map((n) => (
                  <option key={n} value={n}>
                    {n} tickets
                  </option>
                ))}
              </select>
              <FaChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-cream/70"
              />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-cream/80">×</span>
              <span className="text-cream/45 line-through">
                ${STANDARD_USD}
              </span>
              <span className="text-cream/80">${FAMILY_PACK.usd} =</span>
              <span className={`${HEADING} text-[24px] leading-none text-tan`}>
                ${total}
              </span>
            </span>
          </div>
          {Array.from({ length: quantity }, (_, i) => (
            <fieldset key={i} disabled={busy} className="flex flex-col gap-2">
              <legend className="mb-2">Attendee {i + 1}</legend>
              <Input
                name={`name_${i}`}
                aria-label={`Attendee ${i + 1} name`}
                placeholder="Full name"
                maxLength={80}
                required
              />
              <Input
                name={`email_${i}`}
                aria-label={`Attendee ${i + 1} email`}
                placeholder="Email"
                type="email"
                maxLength={254}
                required
              />
            </fieldset>
          ))}
          <p className="text-sm text-cream/80">
            Each attendee will receive a ticket email, and the email you provide
            at Stripe checkout will get all of them for reference.
          </p>
          {error && (
            <p role="alert" className="text-tan">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            className="h-12 w-full text-base"
          >
            {busy ? "Opening checkout…" : `Pay $${total}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
