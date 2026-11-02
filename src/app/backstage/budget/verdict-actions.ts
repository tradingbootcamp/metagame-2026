"use server";

import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { pickVerdict } from "@/lib/budget-models";
import type { Result } from "./actions";

/** Records which model's verdict the reviewer went with (META-4571). */
export async function pickVerdictAction(
  xeroId: string,
  model: string,
): Promise<Result> {
  const admin = await requireAccess("budget.manage");
  if (!admin) return { ok: false, error: EXPIRED };
  try {
    await pickVerdict(xeroId, model);
    return { ok: true, message: `${model} marked as picked.` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
