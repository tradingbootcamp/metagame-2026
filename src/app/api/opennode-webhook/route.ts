import { NextResponse } from "next/server";
import { recordPurchase } from "@/lib/airtable";
import { getCharge, verifyWebhookSignature } from "@/lib/opennode";

// HMAC verification + the OpenNode key need Node crypto — keep this off the edge.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // OpenNode posts application/x-www-form-urlencoded.
  const params = new URLSearchParams(await request.text());
  const id = params.get("id") ?? "";
  const status = params.get("status") ?? "";
  const hashedOrder = params.get("hashed_order") ?? "";

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Verify the HMAC when a key is configured. verifyWebhookSignature throws if
  // OPENNODE_KEY is unset, so treat that as "unconfigured, skip" rather than 500.
  let keyConfigured = true;
  try {
    if (!verifyWebhookSignature({ id, hashed_order: hashedOrder })) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    keyConfigured = false;
  }

  // Only act on a paid charge; everything else gets a fast 200 so OpenNode stops.
  if (status !== "paid") {
    return NextResponse.json({ received: true });
  }

  if (!keyConfigured) {
    // Can't trust an unverified "paid" — acknowledge but don't record.
    console.warn("[opennode-webhook] OPENNODE_KEY unset — ignoring paid event");
    return NextResponse.json({ received: true, configured: false });
  }

  try {
    const charge = await getCharge(id);
    const meta = (charge.metadata ?? {}) as Record<string, unknown>;

    await recordPurchase({
      id: charge.id,
      customerName: meta.name ? String(meta.name) : undefined,
      customerEmail: meta.email ? String(meta.email) : undefined,
      amount: meta.usd != null ? Number(meta.usd) : undefined,
      btcAmount: meta.btc != null ? Number(meta.btc) : undefined,
      ticketType: meta.ticketLabel ? String(meta.ticketLabel) : undefined,
      status: "Paid",
      test: meta.test === true || meta.test === "true",
      paymentMethod: "btc",
    });
  } catch (err) {
    // 500 → OpenNode retries; recordPurchase upserts on ID, so a retry can't dupe.
    console.error("[opennode-webhook] failed to record purchase:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
