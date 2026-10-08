import type Stripe from "stripe";
import { env } from "@/env";
import {
  identityOf,
  MAX_SLUG_ATTEMPTS,
  normalizeCustomCode,
  normalizeName,
  normalizePurpose,
  normalizeUses,
  PROMO_SOURCE,
  PromoError,
  seedOf,
  slugCode,
  type MintInput,
  type MintResult,
  type Prior,
} from "@/lib/promo-codes";
import { getPromoStripe, promoMode } from "@/lib/stripe-promo";

// The Stripe (card) rail: each code is a promotion code pointing at a
// hand-made dashboard coupon. Never set `customer` on a promotion code — a
// customer-scoped code only redeems when checkout is pre-attached to that
// customer, which breaks self-serve "enter your code" redemption.

export type Coupon = {
  id: string;
  label: string;
  isDefault: boolean;
  kind: "percent" | "amount";
};

export type StripeCode = {
  id: string;
  code: string;
  name: string;
  email: string;
  purpose: string;
  notes: string;
  redeemed: number;
  max: number | null; // null = uncapped
  active: boolean;
  created: number; // unix seconds
  coupon: string;
};

const meta = (p: Stripe.PromotionCode): Stripe.Metadata => p.metadata ?? {};

function stripeOrThrow(): Stripe {
  const stripe = getPromoStripe();
  if (!stripe)
    throw new PromoError(
      "Stripe rail isn't configured — set STRIPE_PROMO_KEY.",
      "config",
    );
  return stripe;
}

/** "Student — 50% off", or just the discount when the coupon's name adds nothing. */
function couponLabel(c: Stripe.Coupon | null | undefined): string {
  if (!c) return "";
  const discount =
    c.percent_off != null
      ? `${c.percent_off}% off`
      : c.amount_off != null
        ? `$${(c.amount_off / 100).toFixed(2)} off`
        : (c.name ?? c.id);
  return c.name && c.name !== discount ? `${c.name} — ${discount}` : discount;
}

/** Usable dashboard coupons for the tier dropdown, grouped by kind and sorted ascending. */
export async function listCoupons(): Promise<Coupon[]> {
  const stripe = stripeOrThrow();
  const coupons = await stripe.coupons
    .list({ limit: 100 })
    .autoPagingToArray({ limit: 300 });
  const magnitude = (c: Stripe.Coupon) =>
    c.percent_off ?? (c.amount_off ?? 0) / 100;
  const kind = (c: Stripe.Coupon) =>
    c.percent_off != null ? ("percent" as const) : ("amount" as const);
  return coupons
    .filter((c) => c.valid)
    .sort(
      (a, b) =>
        kind(a).localeCompare(kind(b)) ||
        magnitude(a) - magnitude(b) ||
        couponLabel(a).localeCompare(couponLabel(b)),
    )
    .map((c) => ({
      id: c.id,
      label: couponLabel(c),
      isDefault: c.id === env.COMP_COUPON_ID,
      kind: kind(c),
    }));
}

type Probe =
  | { status: "created"; promo: Stripe.PromotionCode }
  | { status: "reused"; promo: Stripe.PromotionCode; prior: Prior }
  | { status: "taken"; promo: Stripe.PromotionCode };

type Resolved = {
  email: string;
  name: string;
  uses: number | null;
  coupon: string;
  purpose: string;
  notes: string;
  issuedBy: string;
};

async function createOrReuse(
  stripe: Stripe,
  code: string,
  { email, name, uses, coupon, purpose, notes, issuedBy }: Resolved,
): Promise<Probe> {
  try {
    const promo = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon },
      code,
      ...(uses != null ? { max_redemptions: uses } : {}),
      metadata: {
        email,
        name,
        source: PROMO_SOURCE,
        coupon,
        purpose,
        notes,
        issued_by: issuedBy,
      },
    });
    return { status: "created", promo };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    const dup =
      e.code === "resource_already_exists" ||
      /already exists/i.test(e.message ?? "");
    if (!dup) throw err;
    const p = (await stripe.promotionCodes.list({ code, limit: 1 })).data[0];
    if (!p) throw err;
    const want = identityOf({ email, name });
    const owner = identityOf({
      email: meta(p).email,
      name: meta(p).name,
    });
    // Same guest → reuse. No identity on either side (an anonymous custom code)
    // → reuse only if it's one of ours; never claim a stranger's code.
    const mine = want ? owner === want : meta(p).source === PROMO_SOURCE;
    if (!mine) return { status: "taken", promo: p };
    const prior: Prior = {
      name: meta(p).name ?? "",
      email: meta(p).email ?? "",
      purpose: meta(p).purpose ?? "",
      created: p.created,
      redeemed: p.times_redeemed ?? 0,
    };
    // A re-run is how a mis-filed code gets fixed: carry the new purpose/notes
    // onto it (the stripe-webhook re-mirrors on promotion_code.updated).
    const patch: Record<string, string> = {};
    if (purpose !== (meta(p).purpose ?? "")) patch.purpose = purpose;
    if (notes && notes !== (meta(p).notes ?? "")) patch.notes = notes;
    const promo = Object.keys(patch).length
      ? await stripe.promotionCodes.update(p.id, { metadata: patch })
      : p;
    return { status: "reused", promo, prior };
  }
}

export async function mintStripeCode(
  input: MintInput & { couponId?: string; issuedBy: string },
): Promise<MintResult> {
  const stripe = stripeOrThrow();
  const name = normalizeName(input.name);
  const purpose = normalizePurpose(input.purpose);
  const coupon = input.couponId || env.COMP_COUPON_ID;
  if (!coupon)
    throw new PromoError(
      "No coupon to attach — pick one, or set COMP_COUPON_ID.",
      "config",
    );
  const email = (input.email ?? "").trim();
  const resolved: Resolved = {
    email,
    name,
    uses: normalizeUses(input.maxUses),
    coupon,
    purpose,
    notes: (input.notes ?? "").trim(),
    issuedBy: input.issuedBy,
  };

  const result = (r: Probe): MintResult => ({
    rail: "stripe",
    code: r.promo.code,
    name,
    email,
    reused: r.status === "reused",
    prior: r.status === "reused" ? r.prior : undefined,
    max: r.promo.max_redemptions ?? null,
    purpose: meta(r.promo).purpose || purpose,
    test: promoMode() === "test",
  });

  const custom = normalizeCustomCode(input.customCode);
  if (custom) {
    const r = await createOrReuse(stripe, custom, resolved);
    if (r.status === "taken")
      throw new PromoError(
        `Code ${r.promo.code} already belongs to a different guest — pick another custom code`,
        "collision",
      );
    return result(r);
  }

  const seed = seedOf({ email, name });
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const r = await createOrReuse(stripe, slugCode(seed, attempt), resolved);
    if (r.status !== "taken") return result(r);
  }
  throw new PromoError(
    "Could not find a free code after several attempts — try a custom code",
    "exhausted",
  );
}

/**
 * Every code this tool minted, newest first. Scoped by metadata.source, not
 * coupon, so it spans all tiers; Stripe can't filter by metadata server-side,
 * so list-all-then-filter.
 */
export async function listStripeCodes(): Promise<StripeCode[]> {
  const stripe = stripeOrThrow();
  const codes = await stripe.promotionCodes
    .list({ limit: 100, expand: ["data.promotion.coupon"] })
    .autoPagingToArray({ limit: 1000 });
  return codes
    .filter((p) => meta(p).source === PROMO_SOURCE)
    .map((p) => {
      const coupon = p.promotion?.coupon;
      return {
        id: p.id,
        code: p.code,
        name: meta(p).name ?? "",
        email: meta(p).email ?? "",
        purpose: meta(p).purpose ?? "",
        notes: meta(p).notes ?? "",
        redeemed: p.times_redeemed ?? 0,
        max: p.max_redemptions ?? null,
        active: p.active,
        created: p.created,
        coupon: couponLabel(typeof coupon === "string" ? null : coupon),
      };
    });
}

/** Stripe can't delete promotion codes, only deactivate; "archive" flips `active`. */
export async function setStripeCodeActive(
  id: string,
  active: boolean,
): Promise<void> {
  await stripeOrThrow().promotionCodes.update(id, { active });
}
