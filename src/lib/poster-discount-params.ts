export type PosterDiscounts = { stripe: string; btc: string };
export const NO_POSTER_DISCOUNTS: PosterDiscounts = { stripe: "", btc: "" };

export function posterDiscountsFromParams(
  params: URLSearchParams,
): PosterDiscounts {
  const code = (key: string) => {
    const value = params.get(key) ?? "";
    return /^[a-z0-9_-]{1,100}$/i.test(value) ? value : "";
  };
  return { stripe: code("poster_promo"), btc: code("poster_btc") };
}

export function withPosterDiscountParams(
  destination: string,
  discounts: PosterDiscounts,
): string {
  const url = new URL(destination);
  url.searchParams.set("poster_offer", "1");
  if (discounts.stripe) url.searchParams.set("poster_promo", discounts.stripe);
  if (discounts.btc) url.searchParams.set("poster_btc", discounts.btc);
  url.hash = "tickets";
  return url.toString();
}

export function posterStripeHref(
  href: string,
  discounts: PosterDiscounts,
): string {
  const url = new URL(href, "https://metagame.games");
  if (
    discounts.stripe &&
    url.pathname === "/api/checkout/stripe" &&
    url.searchParams.get("tier") === "standard"
  ) {
    url.searchParams.set("promo", discounts.stripe);
    url.searchParams.set("poster_offer", "1");
  }
  return url.pathname + url.search + url.hash;
}
