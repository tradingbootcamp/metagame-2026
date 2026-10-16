import { NextResponse } from "next/server";
import {
  FAMILY_PACK,
  packMetadata,
  parsePackAttendees,
} from "@/lib/family-pack";
import { getStripe } from "@/lib/stripe";
import { pickUtm } from "@/lib/utm";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let attendees;
  let body;
  try {
    body = await request.json();
    attendees = parsePackAttendees(body?.attendees);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid pack." },
      { status: 400 },
    );
  }
  const stripe = getStripe();
  if (!stripe)
    return NextResponse.json(
      { error: "Checkout isn't available right now." },
      { status: 503 },
    );
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  ).replace(/\/$/, "");
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: FAMILY_PACK.usd * 100,
            product_data: {
              name: `${FAMILY_PACK.label} — Standard weekend admission`,
            },
          },
          quantity: attendees.length,
        },
      ],
      allow_promotion_codes: false,
      metadata: {
        ...packMetadata(attendees),
        ...pickUtm((key) => body?.[key]),
      },
      name_collection: { individual: { enabled: true, optional: false } },
      custom_text: {
        submit: {
          message:
            "4–6 paid weekend tickets at $375 each. Children under 13 attend free and do not count toward the pack. Your group ticket codes will be emailed to the buyer.",
        },
      },
      success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#tickets`,
    });
    if (!session.url) throw new Error("Checkout URL missing.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout/family-pack]", error);
    return NextResponse.json(
      { error: "Couldn't start checkout. Please try again." },
      { status: 502 },
    );
  }
}
