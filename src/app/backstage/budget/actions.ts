"use server";

import { revalidatePath } from "next/cache";
import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { requestRows, runImport } from "@/lib/budget-import";
import {
  appendRows,
  loadLedger,
  nextId,
  PHASES,
  removeRow,
  replaceRow,
  toInput,
  type LedgerRow,
  type RowInput,
} from "@/lib/budget-sheet";
import { ignoreXeroId } from "@/lib/budget-store";

const PATH = "/backstage/budget";

export type Result =
  | { ok: true; message: string; id?: string }
  | { ok: false; error: string };

const fail = (err: unknown): Result => ({
  ok: false,
  error: err instanceof Error ? err.message : String(err),
});

/** The fields a reviewer may change before approving. */
export type RowPatch = {
  item: string;
  category: string;
  parent: string;
  phase: string;
  counterparty: string;
};

export type PlanInput = {
  item: string;
  category: string;
  parent: string;
  phase: string;
  counterparty: string;
  budgeted: number | null;
  status: "Planned" | "Committed";
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function runImportAction(since: string): Promise<Result> {
  const admin = await requireAccess("budget.manage");
  if (!admin) return { ok: false, error: EXPIRED };
  try {
    const result = await runImport({
      since: isoDate.test(since) ? since : undefined,
      triggeredBy: admin.name,
    });
    revalidatePath(PATH);
    const { pulled, proposed, skipped, summary } = result;
    return {
      ok: true,
      message: `Pulled ${pulled}, already had ${skipped}, proposed ${proposed}. ${summary}`,
    };
  } catch (err) {
    return fail(err);
  }
}

export async function requestAction(text: string): Promise<Result> {
  const admin = await requireAccess("budget.manage");
  if (!admin) return { ok: false, error: EXPIRED };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Say what to add." };
  try {
    const { rows, categories } = await loadLedger();
    const { inputs, summary } = await requestRows(
      trimmed,
      rows,
      categories,
      admin.name,
    );
    if (inputs.length) await appendRows(rows, inputs);
    revalidatePath(PATH);
    return {
      ok: true,
      message: `${inputs.length} row${inputs.length === 1 ? "" : "s"} proposed. ${summary}`,
    };
  } catch (err) {
    return fail(err);
  }
}

type Checked = { category: string; parent: string; phase: string };

/** Category must exist; parent must be a root plan row in the same category. */
function check(
  patch: { category: string; parent: string; phase: string },
  rows: LedgerRow[],
  categories: { name: string }[],
  self?: string,
): Checked | Result {
  if (!categories.some((c) => c.name === patch.category)) {
    return { ok: false, error: "Pick a category." };
  }
  const phase = (PHASES as readonly string[]).includes(patch.phase)
    ? patch.phase
    : "";
  if (!patch.parent) return { category: patch.category, parent: "", phase };
  const parent = rows.find((r) => r.id === patch.parent);
  if (!parent || parent.id === self || parent.parent) {
    return { ok: false, error: "That parent isn't a plan row." };
  }
  if (parent.category !== patch.category) {
    return {
      ok: false,
      error: `Parent ${parent.id} is in ${parent.category}; match it or clear the parent.`,
    };
  }
  return { category: patch.category, parent: parent.id, phase };
}

export async function approveAction(
  id: string,
  patch: RowPatch,
): Promise<Result> {
  const admin = await requireAccess("budget.manage");
  if (!admin) return { ok: false, error: EXPIRED };
  try {
    const { rows, categories } = await loadLedger();
    const row = rows.find((r) => r.id === id);
    if (!row) return { ok: false, error: `${id} is no longer in the sheet.` };
    const item = patch.item.trim();
    if (!item) return { ok: false, error: "Give it a name." };
    const checked = check(patch, rows, categories, id);
    if ("ok" in checked) return checked;
    const input: RowInput = {
      ...toInput(row),
      item,
      ...checked,
      counterparty: patch.counterparty.trim(),
      status: row.actual !== null ? "Done" : "Planned",
      proposal: "",
    };
    await replaceRow(row.row, input);
    revalidatePath(PATH);
    return { ok: true, message: `${id} approved.`, id };
  } catch (err) {
    return fail(err);
  }
}

/** Approves as proposed, for the obvious ones. */
export async function approveManyAction(ids: string[]): Promise<Result> {
  const admin = await requireAccess("budget.manage");
  if (!admin) return { ok: false, error: EXPIRED };
  try {
    const { rows, categories } = await loadLedger();
    let count = 0;
    for (const id of ids) {
      const row = rows.find((r) => r.id === id && r.status === "Proposed");
      if (!row) continue;
      const checked = check(row, rows, categories, id);
      if ("ok" in checked) continue;
      await replaceRow(row.row, {
        ...toInput(row),
        ...checked,
        status: row.actual !== null ? "Done" : "Planned",
        proposal: "",
      });
      count++;
    }
    revalidatePath(PATH);
    return { ok: true, message: `${count} approved.` };
  } catch (err) {
    return fail(err);
  }
}

export async function rejectAction(
  id: string,
  reason: string,
): Promise<Result> {
  const admin = await requireAccess("budget.manage");
  if (!admin) return { ok: false, error: EXPIRED };
  try {
    const { rows } = await loadLedger();
    const row = rows.find((r) => r.id === id);
    if (!row) return { ok: false, error: `${id} is no longer in the sheet.` };
    if (row.status !== "Proposed") {
      return {
        ok: false,
        error: `${id} isn't a proposal; edit it in the sheet.`,
      };
    }
    if (row.xeroId) await ignoreXeroId(row.xeroId, reason.trim(), admin.name);
    await removeRow(row.row);
    revalidatePath(PATH);
    return { ok: true, message: `${id} removed.`, id };
  } catch (err) {
    return fail(err);
  }
}

/** A plan row typed by hand goes straight in; nothing to review. */
export async function addPlanAction(input: PlanInput): Promise<Result> {
  const admin = await requireAccess("budget.manage");
  if (!admin) return { ok: false, error: EXPIRED };
  const item = input.item.trim();
  if (!item) return { ok: false, error: "Give it a name." };
  if (input.budgeted !== null && !Number.isFinite(input.budgeted)) {
    return { ok: false, error: "Amount must be a number." };
  }
  try {
    const { rows, categories } = await loadLedger();
    const checked = check(input, rows, categories);
    if ("ok" in checked) return checked;
    const id = nextId(rows);
    await appendRows(rows, [
      {
        id,
        item,
        ...checked,
        counterparty: input.counterparty.trim(),
        budgeted: input.budgeted,
        status: input.status === "Committed" ? "Committed" : "Planned",
        notes: `added by ${admin.name} ${new Date().toISOString().slice(0, 10)}`,
      },
    ]);
    revalidatePath(PATH);
    return { ok: true, message: `${id} added.`, id };
  } catch (err) {
    return fail(err);
  }
}
