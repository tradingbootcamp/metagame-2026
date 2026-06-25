import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getTicket } from "@/lib/tickets";
import { lookupDiscountCode } from "@/lib/discount-codes";
import { createCharge, getHostedCheckoutUrl } from "@/lib/opennode";

export const runtime = "nodejs";

/** Resolve the public origin: prefer NEXT_PUBLIC_SITE_URL, else the request's. */
function resolveOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return new URL(request.url).origin;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LEN = 200;

export async function POST(request: Request) {
  let body: {
    ticketId?: string;
    name?: string;
    email?: string;
    discord?: string;
    discountCode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ticketId, name, email, discord, discountCode } = body;
  if (!ticketId || !name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "ticketId, name, and email are required" },
      { status: 400 },
    );
  }
  if (
    name.length > MAX_FIELD_LEN ||
    email.length > MAX_FIELD_LEN ||
    (discord != null && discord.length > MAX_FIELD_LEN)
  ) {
    return NextResponse.json({ error: "A field is too long" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const ticket = getTicket(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Unknown ticket" }, { status: 400 });
  }

  // The charged BTC price is always server-derived: a valid Airtable discount code
  // lowers it, otherwise full price. A bad/unknown code never charges less — it
  // falls through to full. Never trust a client-sent price.
  const applied = discountCode ? await lookupDiscountCode(discountCode) : null;
  const btc = applied?.btcPrice ?? ticket.prices.full.btc;
  const btcAmountDiscounted = applied ? ticket.prices.full.btc - btc : 0;
  // usd is the advertised dollar amount stored as the Airtable `Amount`; the
  // discount only drives the BTC charge, so usd stays anchored to the promo price.
  const { usd } = ticket.prices.earlyBird;
  const amountSats = Math.round(btc * 1e8);

  const orderId = crypto.randomUUID();
  const origin = resolveOrigin(request);
  const test = process.env.OPENNODE_ENV !== "live";

  // success_url is fixed at creation and we don't yet have the charge id, so it's
  // keyed on our own orderId. The client stashes the returned chargeId (the page
  // needs it to poll status) — see the route handler / confirmation page.
  const successUrl = `${origin}/checkout/bitcoin/${orderId}`;
  const callbackUrl = `${origin}/api/opennode-webhook`;

  // Everything the webhook needs to record the purchase rides along in metadata,
  // since there's no DB to look it up in later.
  const metadata = {
    orderId,
    ticketId: ticket.id,
    ticketLabel: ticket.label,
    name: name.trim(),
    email: email.trim(),
    // Optional Discord handle — only ride it along when the buyer supplied one.
    ...(discord?.trim() ? { discord: discord.trim() } : {}),
    usd,
    btc,
    discountCode: applied?.code ?? "",
    btcAmountDiscounted,
    test,
  };

  let charge;
  try {
    charge = await createCharge({
      amountSats,
      description: `Metagame 2026 ${ticket.label} ticket — ${email.trim()}`,
      customerEmail: email.trim(),
      orderId,
      metadata,
      callbackUrl,
      successUrl,
    });
  } catch (err) {
    console.error("[opennode] createCharge failed:", err);
    return NextResponse.json(
      { error: "Could not create Bitcoin charge" },
      { status: 502 },
    );
  }

  const hostedCheckoutUrl = getHostedCheckoutUrl(charge.id, charge);

  return NextResponse.json({
    hostedCheckoutUrl,
    orderId,
    chargeId: charge.id,
  });
}
