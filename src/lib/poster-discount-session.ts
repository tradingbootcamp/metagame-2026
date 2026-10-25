import {
  NO_POSTER_DISCOUNTS,
  posterDiscountsFromParams,
  type PosterDiscounts,
} from "./poster-discount-params";

const KEY = "poster-discounts";
const EVENT = "poster-discounts-change";
let captured: PosterDiscounts | null = null;
export const EMPTY_POSTER_DISCOUNT_SNAPSHOT =
  JSON.stringify(NO_POSTER_DISCOUNTS);

export function capturePosterDiscounts(search: string): void {
  const params = new URLSearchParams(search);
  if (!params.has("poster_offer") && !params.has("utm_source")) return;
  const discounts =
    params.get("poster_offer") === "1"
      ? posterDiscountsFromParams(params)
      : NO_POSTER_DISCOUNTS;
  captured = discounts;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(discounts));
  } catch {
    /* Storage is optional; the landing URL still carries the codes. */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function readPosterDiscounts(): PosterDiscounts {
  if (typeof window === "undefined") return NO_POSTER_DISCOUNTS;
  const params = new URLSearchParams(window.location.search);
  if (params.get("poster_offer") === "1")
    return posterDiscountsFromParams(params);
  if (params.has("utm_source")) return NO_POSTER_DISCOUNTS;
  if (captured) return captured;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return posterDiscountsFromParams(
      new URLSearchParams({
        poster_promo: typeof saved?.stripe === "string" ? saved.stripe : "",
        poster_btc: typeof saved?.btc === "string" ? saved.btc : "",
      }),
    );
  } catch {
    return NO_POSTER_DISCOUNTS;
  }
}

export const posterDiscountSnapshot = () =>
  JSON.stringify(readPosterDiscounts());
export function clearPosterDiscounts() {
  captured = NO_POSTER_DISCOUNTS;
  const url = new URL(window.location.href);
  for (const key of ["poster_offer", "poster_promo", "poster_btc"])
    url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url);
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
export function subscribePosterDiscounts(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
