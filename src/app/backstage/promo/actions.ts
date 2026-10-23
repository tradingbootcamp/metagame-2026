"use server";

import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { PromoError, type MintResult } from "@/lib/promo-codes";
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
  const admin = await requireAccess("promo.manage");
  if (!admin) return { error: EXPIRED };

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

  try {
    const minted = await mintStripeCode({
      name,
      email: str(formData, "email"),
      customCode,
      maxUses,
      purpose,
      notes: str(formData, "notes"),
      couponId: str(formData, "couponId") || undefined,
      issuedBy: admin.name,
    });
    return { minted };
  } catch (err) {
    if (err instanceof PromoError && err.code === "collision")
      return { field: "customCode", error: err.message };
    return { error: message(err) };
  }
}

export async function listCodes(): Promise<StripeCode[]> {
  if (!(await requireAccess("promo.manage"))) throw new Error(EXPIRED);
  return listStripeCodes();
}

export async function setActive(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  if (!(await requireAccess("promo.manage"))) return { error: EXPIRED };
  try {
    await setStripeCodeActive(id, active);
    return {};
  } catch (err) {
    return { error: message(err) };
  }
}
