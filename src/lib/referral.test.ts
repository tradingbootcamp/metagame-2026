import { describe, expect, it } from "vitest";
import {
  canRefer,
  couponUsdOff,
  formatReferralCode,
  pickDiscount,
  REFERRAL_USD_OFF,
  referralCodeOf,
} from "./referral";

describe("referral codes", () => {
  it("formats as two groups of four", () => {
    expect(formatReferralCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });

  it("accepts typed and linked forms, rejects other lengths", () => {
    expect(referralCodeOf("abcd-efgh")).toBe("ABCDEFGH");
    expect(referralCodeOf(" abcd efgh ")).toBe("ABCDEFGH");
    expect(referralCodeOf("A2C-4EF")).toBe("");
    expect(referralCodeOf(null)).toBe("");
  });

  it("reads confusable letters as their digits", () => {
    expect(referralCodeOf("0O1IL2U3")).toBe("001112V3");
  });

  it("lets weekend tickets refer but not day passes", () => {
    expect(canRefer("Standard")).toBe(true);
    expect(canRefer("Family & Friends Pack — Standard")).toBe(true);
    expect(canRefer(null)).toBe(true);
    expect(canRefer("Friday Day Pass")).toBe(false);
  });
});

describe("couponUsdOff", () => {
  it("values percent and amount coupons against the full price", () => {
    expect(couponUsdOff({ percent_off: 50 }, 425)).toBe(212.5);
    expect(couponUsdOff({ amount_off: 10000, currency: "usd" }, 425)).toBe(100);
    expect(couponUsdOff({ amount_off: 100000 }, 425)).toBe(425);
    expect(couponUsdOff({ amount_off: 10000, currency: "eur" }, 425)).toBe(0);
    expect(couponUsdOff({}, 425)).toBe(0);
  });
});

describe("pickDiscount", () => {
  it("locks in the bigger of promo and referral", () => {
    expect(pickDiscount(425, 212.5, REFERRAL_USD_OFF)).toEqual({
      applied: "promo",
      usdOff: 212.5,
      usdPay: 212.5,
    });
    expect(pickDiscount(425, 20, REFERRAL_USD_OFF)).toEqual({
      applied: "referral",
      usdOff: 50,
      usdPay: 375,
    });
  });

  it("prefers the promo on a tie, so the code's own tracking applies", () => {
    expect(pickDiscount(425, 50, 50).applied).toBe("promo");
  });

  it("leaves the code box open with neither", () => {
    expect(pickDiscount(425, null, null)).toEqual({
      applied: null,
      usdOff: 0,
      usdPay: 425,
    });
  });

  it("records a referral without a coupon as no discount", () => {
    expect(pickDiscount(425, null, 0).applied).toBe(null);
  });

  it("never pays below zero", () => {
    expect(pickDiscount(425, 425, null).usdPay).toBe(0);
  });
});
