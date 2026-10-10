"use server";

import { adminAccess, EXPIRED, requireAdmin } from "@/lib/admin-auth";
import { PromoError, type MintResult, type Rail } from "@/lib/promo-codes";
import { listBtcCodes, mintBtcCode, type BtcCode } from "@/lib/promo-codes-btc";
import {
  listStripeCodes,
  mintStripeCode,
  setStripeCodeActive,
  type StripeCode,
} from "@/lib/promo-codes-stripe";

export type MintState = {
  error?: string;
  /** Field the error belongs to, when it's one field's fault. */
  field?: string;
  minted?: MintResult;
};

const str = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

export async function mint(
  _prev: MintState,
  formData: FormData,
): Promise<MintState> {
  const access = await adminAccess();
  if (!access?.name) return { error: EXPIRED };

  const rail: Rail = str(formData, "rail") === "btc" ? "btc" : "stripe";
  const name = str(formData, "name");
  if (!name) return { field: "name", error: "Required." };
  const purpose =
    str(formData, "purpose") === "__custom__"
      ? str(formData, "customPurpose")
      : str(formData, "purpose");
  if (!purpose) return { field: "purpose", error: "Required." };
  const unlimited = formData.get("unlimited") === "on";
  const maxUses = unlimited ? null : Number(str(formData, "uses")) || 1;
  const customCode = str(formData, "customCode");
  if (customCode && !/^[A-Za-z0-9-]+$/.test(customCode))
    return {
      field: "customCode",
      error: "Letters, digits, and dashes only.",
    };

  const input = {
    name,
    email: str(formData, "email"),
    customCode,
    maxUses,
    purpose,
    notes: str(formData, "notes"),
  };
  try {
    const minted =
      rail === "btc"
        ? await mintBtcCode(input)
        : await mintStripeCode({
            ...input,
            couponId: str(formData, "couponId") || undefined,
            issuedBy: access.name,
          });
    return { minted };
  } catch (err) {
    if (err instanceof PromoError && err.code === "collision")
      return { field: "customCode", error: err.message };
    return { error: message(err) };
  }
}

export type CodeLists = {
  stripe: StripeCode[];
  btc: BtcCode[];
  /** Per-rail read failures; the other rail's list still shows. */
  errors: Partial<Record<Rail, string>>;
};

export async function listCodes(): Promise<CodeLists> {
  await requireAdmin();
  const [stripe, btc] = await Promise.allSettled([
    listStripeCodes(),
    listBtcCodes(),
  ]);
  return {
    stripe: stripe.status === "fulfilled" ? stripe.value : [],
    btc: btc.status === "fulfilled" ? btc.value : [],
    errors: {
      ...(stripe.status === "rejected"
        ? { stripe: message(stripe.reason) }
        : {}),
      ...(btc.status === "rejected" ? { btc: message(btc.reason) } : {}),
    },
  };
}

export async function setActive(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  if (!(await adminAccess())?.name) return { error: EXPIRED };
  try {
    await setStripeCodeActive(id, active);
    return {};
  } catch (err) {
    return { error: message(err) };
  }
}
