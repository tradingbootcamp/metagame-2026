"use server";

import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { CUSTOM_CODE_RE, PromoError, type MintResult } from "@/lib/promo-codes";
import {
  listStripeCodes,
  mintStripeCode,
  redeemableCode,
  setStripeCodeActive,
  standardAccepts,
  standardProduct,
  type StripeCode,
} from "@/lib/promo-codes-stripe";

export type MintState = {
  error?: string;
  /** Field the error belongs to, when it's one field's fault. */
  field?: string;
  minted?: MintResult;
  /** Whether /ticket/<code> will apply it, so the tool can offer that link. */
  checkout?: boolean;
};

/** A listed code, plus whether /ticket/<code> will apply it. */
export type ListedCode = StripeCode & { checkout: boolean };

const str = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

export async function mint(
  _prev: MintState,
  formData: FormData,
): Promise<MintState> {
  const admin = await requireAccess("promo.create");
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
  if (customCode && !CUSTOM_CODE_RE.test(customCode))
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
    return { minted, checkout: await checkoutTakes(minted.code) };
  } catch (err) {
    if (err instanceof PromoError && err.code === "collision")
      return { field: "customCode", error: err.message };
    return { error: message(err) };
  }
}

// The code already exists by now, so a failed check hides the link rather
// than failing the mint.
async function checkoutTakes(code: string): Promise<boolean> {
  try {
    const found = await redeemableCode(code);
    return !!found && standardAccepts(found.discount, await standardProduct());
  } catch (err) {
    console.error("[promo] checkout check failed", err);
    return false;
  }
}

export async function listCodes(): Promise<ListedCode[]> {
  if (!(await requireAccess("promo.view"))) throw new Error(EXPIRED);
  const [codes, standard] = await Promise.all([
    listStripeCodes(),
    standardProduct(),
  ]);
  return codes.map((c) => ({
    ...c,
    checkout:
      c.redeemable && !!c.discount && standardAccepts(c.discount, standard),
  }));
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
