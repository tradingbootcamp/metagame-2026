import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isEarlyBirdActive } from "@/lib/early-bird";
import { getStripe } from "@/lib/stripe";
import {
  DAY_PASS_TIER,
  getDayPass,
  getTicket,
  stripeMode,
  supporterTier,
  type TicketTier,
} from "@/lib/tickets";
import { pickUtm } from "@/lib/utm";

export const runtime = "nodejs";

/** Resolve the public origin: prefer NEXT_PUBLIC_SITE_URL, else the request's. */
function resolveOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return new URL(request.url).origin;
}

// Keys must stay "discord" / "preferred_name" — the webhook reads them back.
const CUSTOM_FIELDS: Stripe.Checkout.SessionCreateParams.CustomField[] = [
  {
    key: "discord",
    label: { type: "custom", custom: "Discord" },
    type: "text",
    optional: true,
  },
  {
    key: "preferred_name",
    label: { type: "custom", custom: "Preferred name (if different)" },
    type: "text",
    optional: true,
  },
];

type Purchase = {
  price: string;
  metadata: Record<string, string>;
  // Only full tickets take promo codes; supporter + day passes never did.
  ticket?: TicketTier;
};

function resolvePurchase(params: URLSearchParams): Purchase | undefined {
  const tier = params.get("tier");
  if (tier === supporterTier.id) {
    const chip = supporterTier.chips.find(
      (c) => String(c.usd) === params.get("chip"),
    );
    return chip && { price: chip.priceIds[stripeMode], metadata: { tier } };
  }
  if (tier === DAY_PASS_TIER) {
    const pass = getDayPass(params.get("day") ?? "");
    return (
      pass && {
        price: pass.priceIds[stripeMode],
        metadata: { tier, day: pass.id },
      }
    );
  }
  const ticket = tier ? getTicket(tier) : undefined;
  return (
    ticket && {
      price: ticket.priceIds[stripeMode],
      metadata: { tier: ticket.id },
      ticket,
    }
  );
}

/**
 * During early-bird the promo is applied for the buyer (no code box); after it,
 * or on the unlisted `code=own` link for partner/comp codes, the box is shown.
 */
async function promoParams(
  stripe: Stripe,
  ticket: TicketTier,
  ownCode: boolean,
): Promise<
  Pick<
    Stripe.Checkout.SessionCreateParams,
    "discounts" | "allow_promotion_codes"
  >
> {
  if (ownCode || !ticket.promoCode || !isEarlyBirdActive()) {
    return { allow_promotion_codes: true };
  }
  const {
    data: [promo],
  } = await stripe.promotionCodes.list({
    code: ticket.promoCode,
    active: true,
    limit: 1,
  });
  if (!promo) {
    console.warn(
      `[checkout/stripe] no active ${ticket.promoCode} promotion code — showing the code box instead`,
    );
    return { allow_promotion_codes: true };
  }
  return { discounts: [{ promotion_code: promo.id }] };
}

/**
 * GET /api/checkout/stripe?tier=standard[&code=own]
 *   | ?tier=supporter&chip=<usd> | ?tier=day-pass&day=<friday|saturday|sunday>
 *   [&utm_source=…&utm_medium=…&utm_campaign=…&first_visit=…&posthog_id=…]
 * Creates a hosted Checkout Session and redirects to it.
 */
export async function GET(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return new NextResponse("Checkout isn't available right now.", {
      status: 503,
    });
  }

  const params = new URL(request.url).searchParams;
  const purchase = resolvePurchase(params);
  if (!purchase) {
    return new NextResponse("Unknown ticket.", { status: 400 });
  }

  const origin = resolveOrigin(request);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: purchase.price, quantity: 1 }],
      ...(purchase.ticket
        ? await promoParams(
            stripe,
            purchase.ticket,
            params.get("code") === "own",
          )
        : {}),
      metadata: { ...purchase.metadata, ...pickUtm((k) => params.get(k)) },
      custom_fields: CUSTOM_FIELDS,
      name_collection: { individual: { enabled: true, optional: false } },
      success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#tickets`,
    });
    if (!session.url) throw new Error(`session ${session.id} has no url`);
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("[checkout/stripe] session create failed:", err);
    return new NextResponse(
      "Couldn't start checkout. Please go back and try again.",
      { status: 502 },
    );
  }
}
