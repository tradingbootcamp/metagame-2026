"use server";

import { revalidatePath } from "next/cache";
import { teamAccess } from "@/lib/access";
import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { setMagnumOpusAdmin } from "@/lib/permission-store";
import {
  isOverrideName,
  setOverride,
  type Override,
  type OverrideName,
} from "@/lib/site-settings";
import { isDelta } from "@/lib/magnum-opus";
import { adjustBalance, loadLedger } from "@/lib/token-store";

/**
 * Adds or removes someone from the Magnum Opus Admin role. Any holder of
 * magnum_opus.manage may, without users.edit; not on yourself, so nobody
 * locks themselves out by accident.
 */
export async function setAdmin(
  userId: string,
  admin: boolean,
): Promise<{ error?: string }> {
  const access = await requireAccess("magnum_opus.manage");
  const operator = await teamAccess();
  if (!access || !operator) return { error: EXPIRED };
  if (access.userId === userId)
    return { error: "You can't change your own access." };
  try {
    await setMagnumOpusAdmin(userId, admin, operator);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/backstage/magnum-opus");
  revalidatePath("/account");
  return {};
}

export type RecordRow = {
  id: string;
  at: number;
  tokensDelta: number;
  loanDelta: number;
  kind: "loan" | "adjustment";
  by: string | null;
};

/** One account's full change record, newest first, for the accounts panel. */
export async function accountRecord(
  userId: string,
): Promise<{ error?: string; rows?: RecordRow[] }> {
  const access = await requireAccess("magnum_opus.manage");
  if (!access) return { error: EXPIRED };
  const rows = await loadLedger(userId);
  return { rows: rows.map((r) => ({ ...r, at: r.at.getTime() })) };
}

export async function changeOverride(
  name: OverrideName,
  override: Override,
): Promise<{ error?: string }> {
  const access = await requireAccess("magnum_opus.manage");
  if (!access) return { error: EXPIRED };
  if (!isOverrideName(name)) return { error: "Unknown setting." };
  if (override !== null && typeof override !== "boolean")
    return { error: "Pick on, off or on schedule." };
  await setOverride(name, override, access.userId);
  revalidatePath("/backstage/magnum-opus");
  revalidatePath("/account");
  return {};
}

export async function changeBalance(
  userId: string,
  tokensDelta: number,
  loanDelta: number,
): Promise<{ error?: string }> {
  const access = await requireAccess("magnum_opus.manage");
  if (!access) return { error: EXPIRED };
  if (access.userId === userId)
    return { error: "Someone else has to change your balance." };
  if (!isDelta(tokensDelta) || !isDelta(loanDelta))
    return { error: "Changes must be whole numbers." };
  if (tokensDelta === 0 && loanDelta === 0)
    return { error: "Enter a change to tokens or the loan." };
  const result = await adjustBalance(
    userId,
    tokensDelta,
    loanDelta,
    access.userId,
  );
  if (result !== "ok")
    return {
      error:
        result === "missing"
          ? "That account no longer exists."
          : "A loan can't go below 0.",
    };
  revalidatePath("/backstage/magnum-opus");
  revalidatePath("/account");
  return {};
}
