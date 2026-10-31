import "server-only";
import {
  discountText,
  redeemableCode,
  standardProduct,
  type CodeDiscount,
} from "@/lib/promo-codes-stripe";

// Posters are public, so a printed code can't be worth more than this.
export const POSTER_PROMO_MAX = { usd: 100, percent: 50 };

/** Whether a code can go on a poster: everyone, Standard tickets, within the cap. */
export function posterAccepts(
  discount: CodeDiscount,
  standard: string,
): boolean {
  return (
    !discount.restricted &&
    (!discount.products || discount.products.includes(standard)) &&
    (discount.percentOff ?? 0) <= POSTER_PROMO_MAX.percent &&
    (discount.amountOff ?? 0) <= POSTER_PROMO_MAX.usd
  );
}

export type PosterPromoCheck =
  | { ok: true; code: string; discount: string }
  | { ok: false };

/**
 * A code as the poster prints it. Every rejection looks the same, so the
 * public page can't tell a missing code from one worth too much.
 */
export async function checkPosterPromo(
  code: string,
): Promise<PosterPromoCheck> {
  const found = await redeemableCode(code);
  if (!found || !posterAccepts(found.discount, await standardProduct()))
    return { ok: false };
  return { ok: true, code: found.code, discount: discountText(found.discount) };
}
