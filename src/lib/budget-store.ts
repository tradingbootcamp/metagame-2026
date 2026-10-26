import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { budgetImportRuns, budgetIgnoredLines } = schema;

export type ImportRun = typeof budgetImportRuns.$inferSelect;

export async function startRun(
  since: string,
  triggeredBy: string,
): Promise<ImportRun> {
  const [run] = await getDb()
    .insert(budgetImportRuns)
    .values({ status: "running", since, triggeredBy })
    .returning();
  return run;
}

export async function finishRun(
  id: string,
  patch: Partial<
    Pick<
      ImportRun,
      "status" | "pulled" | "proposed" | "skipped" | "summary" | "error"
    >
  >,
): Promise<void> {
  await getDb()
    .update(budgetImportRuns)
    .set({ ...patch, finishedAt: new Date() })
    .where(eq(budgetImportRuns.id, id));
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
