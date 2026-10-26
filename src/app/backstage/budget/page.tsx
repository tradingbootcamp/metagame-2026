import { connection } from "next/server";
import SignIn from "../SignIn";
import BudgetTool, { type RunSummary, type Spend } from "./BudgetTool";
import { toolAccess } from "@/lib/admin-auth";
import { defaultSince } from "@/lib/budget-import";
import {
  isPlanRow,
  loadLedger,
  sheetUrl,
  type Category,
  type LedgerRow,
} from "@/lib/budget-sheet";
import { costUsd } from "@/lib/budget-pricing";
import { recentRuns, usageTotals } from "@/lib/budget-store";
import { sheetsConfigured } from "@/lib/google-sheets";
import { xeroConfigured, xeroStatus, type XeroStatus } from "@/lib/xero";

// Imports and requests call Xero, Claude and Sheets in turn; the default
// action timeout is too short for that.
export const maxDuration = 120;

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const access = await toolAccess("budget.view");
  if (!access) return <SignIn next="/backstage/budget" />;
  const canManage = Boolean(await toolAccess("budget.manage"));

  const params = await searchParams;
  const notice = xeroNotice(params);

  let rows: LedgerRow[] = [];
  let categories: Category[] = [];
  let sheetError: string | null = null;
  if (sheetsConfigured()) {
    try {
      ({ rows, categories } = await loadLedger());
    } catch (err) {
      sheetError = err instanceof Error ? err.message : String(err);
    }
  } else {
    sheetError =
      "GOOGLE_SERVICE_ACCOUNT_JSON isn’t set, so the sheet is unreachable.";
  }

  let xero: XeroStatus = {
    connected: false,
    tenantName: null,
    connectedBy: null,
    updatedAt: null,
  };
  let runs: RunSummary[] = [];
  let spend: Spend = { calls: 0, cost: null, tokens: 0 };
  try {
    const [status, recent, totals] = await Promise.all([
      xeroStatus(),
      recentRuns(12),
      usageTotals(),
    ]);
    xero = status;
    runs = recent.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      triggeredBy: r.triggeredBy,
      since: r.since,
      pulled: r.pulled,
      proposed: r.proposed,
      skipped: r.skipped,
      summary: r.summary,
      error: r.error,
      startedAt: r.startedAt.toISOString(),
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      cost: costUsd(r.model, r.inputTokens, r.outputTokens),
    }));
    // Cost is null if any model with usage is off the price table.
    let cost: number | null = 0;
    for (const t of totals) {
      const c = costUsd(t.model, t.inputTokens, t.outputTokens);
      if (c === null && t.inputTokens + t.outputTokens > 0) cost = null;
      else if (cost !== null && c !== null) cost += c;
    }
    spend = {
      calls: totals.reduce((n, t) => n + t.calls, 0),
      tokens: totals.reduce((n, t) => n + t.inputTokens + t.outputTokens, 0),
      cost,
    };
  } catch (err) {
    console.error("[budget] database read failed", err);
  }

  return (
    <BudgetTool
      queue={rows.filter((r) => r.status === "Proposed")}
      plans={rows.filter(isPlanRow)}
      ledger={rows.filter((r) => r.status !== "Proposed")}
      categories={categories}
      canManage={canManage}
      xero={{ ...xero, configured: xeroConfigured() }}
      runs={runs}
      spend={spend}
      sheetUrl={sheetUrl()}
      sheetError={sheetError}
      defaultSince={defaultSince(rows)}
      notice={notice}
    />
  );
}

function xeroNotice(
  params: Record<string, string | string[] | undefined>,
): string | null {
  const first = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  switch (first("xero")) {
    case "connected":
      return `Xero connected to ${first("org") ?? "the organisation"}.`;
    case "error":
      return `Xero connection failed: ${first("message") ?? "unknown error"}.`;
    case "unconfigured":
      return "XERO_CLIENT_ID / XERO_CLIENT_SECRET aren’t set on this deployment.";
    case "forbidden":
      return "You don’t have budget access.";
    default:
      return null;
  }
}
