import { NextResponse } from "next/server";
import { resolveDiscount } from "@/lib/referral-checkout";
import { getStripe } from "@/lib/stripe";
import { getTicket } from "@/lib/tickets";

export const runtime = "nodejs";

/**
 * GET /api/checkout/stripe/discount?code=<code>
 * What a code takes off a Standard ticket, for the discount modal; null when
 * it isn't live. Advisory: checkout resolves the code again.
 */
export async function GET(request: Request) {
  const stripe = getStripe();
  const code = new URL(request.url).searchParams.get("code");
  const full = getTicket("standard")!.prices.full.usd;
  const discount = stripe ? await resolveDiscount(stripe, code, full) : null;
  return NextResponse.json({ full, usdOff: discount?.usdOff ?? null });
}
