import { NextResponse } from "next/server";
import { unsubscribeSignup } from "@/lib/airtable";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST { sessionId } — opt a ticket buyer out of the mailing list. Keyed on the
 * Checkout Session rather than an email so only the buyer's own address can be
 * unsubscribed from /thanks.
 */
export async function POST(request: Request) {
  let body: { sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
  const { sessionId } = body;
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Opt-out is temporarily unavailable" },
      { status: 503 },
    );
  }

  let email: string | null | undefined;
  let livemode: boolean;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    email = session.customer_details?.email;
    livemode = session.livemode;
  } catch {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }
  if (!email) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }

  try {
    const result = await unsubscribeSignup(email, { test: !livemode });
    if (!result.stored && process.env.NODE_ENV === "production") {
      console.error(
        "[opt-out] Airtable not configured in production — opt-out not stored",
      );
      return NextResponse.json(
        { error: "Opt-out is temporarily unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, stored: result.stored });
  } catch (err) {
    console.error("[opt-out] failed to store opt-out:", err);
    return NextResponse.json(
      { error: "Failed to save opt-out" },
      { status: 500 },
    );
  }
}
