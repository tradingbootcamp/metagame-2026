import { NextResponse } from "next/server";
import { getTicket } from "@/lib/tickets";
import { lookupDiscountCode } from "@/lib/discount-codes";

export const runtime = "nodejs";

// Live price-preview for the BTC modal — validates a discount code and reports the
// BTC price it would charge. Performs NO charge; the create-charge route re-derives
// the price server-side, so this endpoint is advisory only.
export async function POST(request: Request) {
  let body: { code?: string; ticketId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ticket = getTicket(body.ticketId ?? "standard");
  if (!ticket) {
    return NextResponse.json({ error: "Unknown ticket" }, { status: 400 });
  }
  const fullBtc = ticket.prices.full.btc;

  const code = (body.code ?? "").trim();
  const applied = code ? await lookupDiscountCode(code) : null;

  return NextResponse.json({
    valid: applied != null,
    btcPrice: applied?.btcPrice ?? null,
    label: applied?.label,
    fullBtc,
  });
}
