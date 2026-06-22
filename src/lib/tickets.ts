// Stripe Payment Links are public, no-auth checkout URLs — no secret key or API
// call is involved, so both test- and live-mode links are safe to commit. Live
// links serve only in production; local dev and Vercel previews use the sandbox
// (test_) links so testing never fires a real charge.
//
// BTC prices are hardcoded (no live conversion). The BTC charge currently always
// uses the early-bird price, mirroring the Stripe early-bird promo. To switch the
// active phase later, point the BTC route at `prices.full` instead — no cutoff
// logic is built here on purpose.

type StripeMode = "test" | "live";

const stripeMode: StripeMode =
  process.env.VERCEL_ENV === "production" ? "live" : "test";

/** A price point in both currencies. usd = dollars, btc = whole bitcoin. */
export type Price = {
  usd: number;
  btc: number;
};

export type TicketTier = {
  id: string;
  label: string;
  prices: {
    full: Price; // pre-discount, shown struck-through for anchoring
    earlyBird: Price; // what they pay once the promo / BTC discount applies
  };
  promoCode?: string; // Stripe promotion code, prefilled into the checkout URL
  links: Record<StripeMode, string>;
};

export const ticketTiers: TicketTier[] = [
  {
    id: "standard",
    label: "Standard",
    prices: {
      full: { usd: 425, btc: 0.0065 },
      earlyBird: { usd: 325, btc: 0.005 },
    },
    // Must match the promotion code string created in Stripe ($100-off coupon).
    promoCode: "EARLYBIRD",
    links: {
      test: "https://buy.stripe.com/test_7sY8wO7kj5J5cF56J4fw402",
      live: "https://buy.stripe.com/fZu8wO5cb2wT5cD6J4fw405",
    },
  },
];

/** Look up a tier by id; undefined when none matches. */
export function getTicket(id: string): TicketTier | undefined {
  return ticketTiers.find((t) => t.id === id);
}

/**
 * Checkout URL for the active Stripe mode, with the early-bird promo code
 * prefilled. Returns null when no link is configured for this mode yet, so the
 * UI can hide the CTA rather than link somewhere dead.
 */
export function ticketUrl(tier: TicketTier): string | null {
  const base = tier.links[stripeMode];
  if (!base) return null;
  return tier.promoCode
    ? `${base}?prefilled_promo_code=${tier.promoCode}`
    : base;
}
