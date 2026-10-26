import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { budgetImportRuns, budgetIgnoredLines } = schema;

export type ImportRun = typeof budgetImportRuns.$inferSelect;

export type RunKind = "import" | "request";

export async function startRun(
  since: string,
  triggeredBy: string,
  kind: RunKind = "import",
): Promise<ImportRun> {
  const [run] = await getDb()
    .insert(budgetImportRuns)
    .values({ status: "running", since, triggeredBy, kind })
    .returning();
  return run;
}

export async function finishRun(
  id: string,
  patch: Partial<
    Pick<
      ImportRun,
      | "status"
      | "pulled"
      | "proposed"
      | "skipped"
      | "summary"
      | "error"
      | "model"
      | "inputTokens"
      | "outputTokens"
    >
  >,
): Promise<void> {
  await getDb()
    .update(budgetImportRuns)
    .set({ ...patch, finishedAt: new Date() })
    .where(eq(budgetImportRuns.id, id));
}

export type UsageTotal = {
  model: string | null;
  calls: number;
  inputTokens: number;
  outputTokens: number;
};

/** Token totals per model across every run, for the spend line. */
export async function usageTotals(): Promise<UsageTotal[]> {
  const rows = await getDb()
    .select({
      model: budgetImportRuns.model,
      calls: sql<number>`count(*)::int`,
      inputTokens: sql<number>`coalesce(sum(${budgetImportRuns.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${budgetImportRuns.outputTokens}), 0)::int`,
    })
    .from(budgetImportRuns)
    .groupBy(budgetImportRuns.model);
  return rows;
}

export async function recentRuns(limit = 5): Promise<ImportRun[]> {
  return getDb()
    .select()
    .from(budgetImportRuns)
    .orderBy(desc(budgetImportRuns.startedAt))
    .limit(limit);
}

export async function ignoredXeroIds(): Promise<Set<string>> {
  const rows = await getDb()
    .select({ xeroId: budgetIgnoredLines.xeroId })
    .from(budgetIgnoredLines);
  return new Set(rows.map((r) => r.xeroId));
}

export async function ignoreXeroId(
  xeroId: string,
  reason: string,
  ignoredBy: string,
): Promise<void> {
  await getDb()
    .insert(budgetIgnoredLines)
    .values({ xeroId, reason, ignoredBy })
    .onConflictDoNothing();
}
