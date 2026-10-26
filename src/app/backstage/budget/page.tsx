import { connection } from "next/server";
import SignIn from "../SignIn";
import BudgetTool, { type RunSummary } from "./BudgetTool";
import { toolAccess } from "@/lib/admin-auth";
import { defaultSince } from "@/lib/budget-import";
import {
  isPlanRow,
  loadLedger,
  sheetUrl,
  type Category,
  type LedgerRow,
} from "@/lib/budget-sheet";
import { verdictsFor } from "@/lib/budget-models";
import { recentRuns } from "@/lib/budget-store";
import type { VerdictRow } from "@/lib/budget-verdicts";
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
  let verdicts: Record<string, VerdictRow[]> = {};
  try {
    const [status, recent, stored] = await Promise.all([
      xeroStatus(),
      recentRuns(),
      verdictsFor(
        rows.filter((r) => r.status === "Proposed").map((r) => r.xeroId),
      ),
    ]);
    xero = status;
    verdicts = stored;
    runs = recent.map((r) => ({
      id: r.id,
      status: r.status,
      triggeredBy: r.triggeredBy,
      since: r.since,
      pulled: r.pulled,
      proposed: r.proposed,
      skipped: r.skipped,
      summary: r.summary,
      error: r.error,
      startedAt: r.startedAt.toISOString(),
    }));
  } catch (err) {
    console.error("[budget] database read failed", err);
  }

  return (
    <BudgetTool
      queue={rows.filter((r) => r.status === "Proposed")}
      verdicts={verdicts}
      plans={rows.filter(isPlanRow)}
      categories={categories}
      canManage={canManage}
      xero={{ ...xero, configured: xeroConfigured() }}
      runs={runs}
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
