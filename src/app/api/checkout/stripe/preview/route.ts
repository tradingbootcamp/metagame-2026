import { NextResponse } from "next/server";
import { resolveStandardDiscounts } from "@/lib/referral-checkout";
import { getStripe } from "@/lib/stripe";
import { getTicket } from "@/lib/tickets";

export const runtime = "nodejs";

// Live price preview for the buy modal: which of the referral and discount
// codes will apply and what the buyer pays. Advisory only; the checkout route
// resolves the codes again when it creates the session.
export async function POST(request: Request) {
  let body: { ref?: string; promo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ticket = getTicket("standard")!;
  const full = ticket.prices.full.usd;
  const stripe = getStripe();
  const d = await resolveStandardDiscounts(
    stripe,
    { promo: body.promo, ref: body.ref },
    full,
  );
  return NextResponse.json({
    full,
    ref: {
      entered: Boolean(body.ref?.trim()),
      valid: d.referrer !== null,
      name: d.referrer?.name ?? null,
      usdOff: d.referralUsdOff,
    },
    promo: {
      entered: Boolean(body.promo?.trim()),
      // Without Stripe configured a code can't be checked, so don't call it wrong.
      valid: d.promo !== null,
      unavailable: Boolean(d.promoInput) && stripe === null,
      code: d.promo?.promo.code ?? null,
      label: d.promo?.label ?? null,
      usdOff: d.promo?.usdOff ?? null,
    },
    ...d.pick,
  });
}
