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
    // In production a missing key isn't an expected dev state — surface it loudly.
    // We still fail closed below (acknowledge, never record an unverified event).
    if (process.env.OPENNODE_ENV === "live") {
      console.error(
        "[opennode-webhook] OPENNODE_KEY unset in live mode — cannot verify webhook; not recording",
      );
    }
  }

  // Cheap early-out: the posted status is untrusted, but a clearly non-terminal
  // event (no chance of being paid) can skip the getCharge round-trip. The
  // authoritative paid decision comes from the re-fetched charge below.
  if (status && status !== "paid") {
    return NextResponse.json({ received: true });
  }

  if (!keyConfigured) {
    // Can't trust an unverified "paid" — acknowledge but don't record.
    console.warn("[opennode-webhook] OPENNODE_KEY unset — ignoring paid event");
    return NextResponse.json({ received: true, configured: false });
  }

  let charge;
  try {
    charge = await getCharge(id);
  } catch (err) {
    // 500 → OpenNode retries; the fetch (not the record) failed, so retry is safe.
    console.error("[opennode-webhook] getCharge failed:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  // Trust the re-fetched charge, never the POSTed status. OpenNode statuses are
  // paid / underpaid / processing / expired / refunded — only "paid" settles.
  // Anything else gets a 200 (no record) so OpenNode stops retrying.
  if (charge.status !== "paid") {
    return NextResponse.json({ received: true, status: charge.status });
  }

  const meta = (charge.metadata ?? {}) as Record<string, unknown>;
  // charge.amount is in satoshis for a BTC charge — this is the BTC actually
  // settled, not the quoted metadata.btc.
  const btcAmount =
    typeof charge.amount === "number" ? charge.amount / 1e8 : undefined;

  try {
    await recordPurchase({
      id: charge.id,
      customerName: meta.name ? String(meta.name) : undefined,
      customerEmail: meta.email ? String(meta.email) : undefined,
      // usd is the quoted price from metadata, not settled fiat.
      amount: meta.usd != null ? Number(meta.usd) : undefined,
      btcAmount,
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
