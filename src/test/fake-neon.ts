import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

type Answer = { rows: unknown[][] };
export type Statement = { sql: string; params: unknown[] };

/**
 * The real Drizzle client over a stand-in for Neon's, so a test sees the SQL
 * that would be sent. `answer` gets every statement and returns rows as arrays
 * in the column order selected, or throws as the database would.
 */
export function fakeNeon(answer: (s: Statement) => unknown[][] | void) {
  const statements: Statement[] = [];
  const batches: Statement[][] = [];
  const run = async (statement: Statement): Promise<Answer> => {
    statements.push(statement);
    return { rows: answer(statement) ?? [] };
  };
  // Lazy like the real one, because a batch hands the statements over unrun.
  const query = (sql: string, params: unknown[]) => ({
    sql,
    params,
    then: (ok: (a: Answer) => unknown, bad: (e: unknown) => unknown) =>
      run({ sql, params }).then(ok, bad),
  });
  const client = Object.assign(query, {
    transaction: async (queries: Statement[]) => {
      batches.push(queries.map(({ sql, params }) => ({ sql, params })));
      const results = [];
      for (const { sql, params } of queries) {
        results.push(await run({ sql, params }));
      }
      return results;
    },
  });
  const db = drizzle({
    client: client as never,
    schema,
    casing: "snake_case",
  });
  return { db, statements, batches };
}
