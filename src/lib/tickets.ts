// Stripe Payment Links are public, no-auth checkout URLs — no secret key or API
// call is involved, so both test- and live-mode links are safe to commit. Live
// links serve only in production; local dev and Vercel previews use the sandbox
// (test_) links so testing never fires a real charge.

type StripeMode = "test" | "live";

const stripeMode: StripeMode =
  process.env.VERCEL_ENV === "production" ? "live" : "test";

export type TicketTier = {
  id: string;
  label: string;
  fullPrice: number; // pre-discount price, shown struck-through for anchoring
  earlyBirdPrice: number; // what they pay once the prefilled promo code applies
  promoCode?: string; // Stripe promotion code, prefilled into the checkout URL
  links: Record<StripeMode, string>;
};

export const ticketTiers: TicketTier[] = [
  {
    id: "early-bird",
    label: "Early bird",
    fullPrice: 425,
    earlyBirdPrice: 325,
    // Must match the promotion code string created in Stripe ($100-off coupon).
    promoCode: "EARLYBIRD",
    links: {
      test: "https://buy.stripe.com/test_7sY8wO7kj5J5cF56J4fw402",
      live: "https://buy.stripe.com/fZu8wO5cb2wT5cD6J4fw405",
    },
  },
];

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
