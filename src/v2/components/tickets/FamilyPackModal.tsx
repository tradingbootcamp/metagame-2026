"use client";

import { useState } from "react";
import { FAMILY_PACK } from "@/lib/family-pack";
import { readUtm } from "@/lib/utm";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

export default function FamilyPackModal({ onClose }: { onClose: () => void }) {
  const [quantity, setQuantity] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
      <DialogContent className="max-h-[90dvh] max-w-[560px] overflow-y-auto p-6">
        <DialogTitle>Family &amp; Friends Pack</DialogTitle>
        <DialogDescription>
          4–6 paid weekend tickets at $375 each. Save $50 per person. Children
          under 13 attend free and do not count toward the minimum. USD checkout
          only; discounts cannot be combined.
        </DialogDescription>
        <form onSubmit={checkout} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            Paid attendees
            <select
              disabled={busy}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="rounded border border-cream/30 bg-navy p-2 text-cream"
            >
              {[4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} tickets — ${(n * FAMILY_PACK.usd).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
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
            One person pays for the pack. The buyer receives all ticket codes to
            share; attendees can check in separately. For changes or refund
            requests, contact team@metagame.games.
          </p>
          {error && (
            <p role="alert" className="text-tan">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy
              ? "Opening checkout…"
              : `Pay $${(quantity * FAMILY_PACK.usd).toLocaleString()} for ${quantity} tickets`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
