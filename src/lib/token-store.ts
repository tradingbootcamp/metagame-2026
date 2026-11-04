import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";
import { holdersOf } from "./permission-store";

const { user, tokenLedger } = schema;

export type Balance = { tokens: number; loanTokens: number };

export async function loadBalance(userId: string): Promise<Balance> {
  const [row] = await getDb()
    .select({ tokens: user.tokens, loanTokens: user.loanTokens })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? { tokens: 0, loanTokens: 0 };
}

/**
 * Adds the deltas to an account if `allowed` holds for its row, and logs the
 * change. One statement (an UPDATE … RETURNING feeding the ledger INSERT):
 * the neon-http driver has no interactive transactions, and db.batch can't
 * make the insert depend on whether the update matched. False when refused.
 */
async function applyChange(change: {
  userId: string;
  tokensDelta: number;
  loanDelta: number;
  kind: "loan" | "adjustment";
  actorId: string;
  allowed: SQL;
}): Promise<boolean> {
  const db = getDb();
  const changed = db.$with("changed").as(
    db
      .update(user)
      .set({
        tokens: sql`${user.tokens} + ${change.tokensDelta}`,
        loanTokens: sql`${user.loanTokens} + ${change.loanDelta}`,
      })
      .where(and(eq(user.id, change.userId), change.allowed))
      .returning({ id: user.id }),
  );
  const logged = await db
    .with(changed)
    .insert(tokenLedger)
    // Insert-select must list every column in table order, defaults included.
    .select((qb) =>
      qb
        .select({
          id: sql`gen_random_uuid()`.as("id"),
          userId: changed.id,
          tokensDelta: sql`${change.tokensDelta}::integer`.as("tokens_delta"),
          loanDelta: sql`${change.loanDelta}::integer`.as("loan_delta"),
          kind: sql`${change.kind}`.as("kind"),
          actorId: sql`${change.actorId}`.as("actor_id"),
          createdAt: sql`now()`.as("created_at"),
        })
        .from(changed),
    )
    .returning({ id: tokenLedger.id });
  return logged.length > 0;
}

/**
 * Both counters go up by `amount`, unless that would take the loan past `cap`
 * (loanCap). The check is against the row inside the statement, so two borrows
 * at once can't both squeeze under it.
 */
export function borrowTokens(
  userId: string,
  amount: number,
  cap: number,
): Promise<boolean> {
  return applyChange({
    userId,
    tokensDelta: amount,
    loanDelta: amount,
    kind: "loan",
    actorId: userId,
    allowed: lte(sql`${user.loanTokens} + ${amount}`, cap),
  });
}

/** A hand edit from backstage: no cap, but the loan can't go below 0. */
export async function adjustBalance(
  userId: string,
  tokensDelta: number,
  loanDelta: number,
  actorId: string,
): Promise<"ok" | "missing" | "negative-loan"> {
  const applied = await applyChange({
    userId,
    tokensDelta,
    loanDelta,
    kind: "adjustment",
    actorId,
    allowed: gte(sql`${user.loanTokens} + ${loanDelta}`, 0),
  });
  if (applied) return "ok";
  const [exists] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return exists ? "negative-loan" : "missing";
}

export type AccountBalance = Balance & {
  id: string;
  name: string;
  email: string;
};

// Same cap as /backstage/users: every account comes down and the browser searches.
const CAP = 2000;

export async function listBalances(): Promise<AccountBalance[]> {
  return getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      tokens: user.tokens,
      loanTokens: user.loanTokens,
    })
    .from(user)
    .orderBy(asc(user.name))
    .limit(CAP);
}

export type LedgerEntry = {
  id: string;
  at: Date;
  tokensDelta: number;
  loanDelta: number;
  kind: "loan" | "adjustment";
  /** Who made it: the borrower for a loan; null once their account is gone. */
  by: string | null;
};

const actor = alias(user, "actor");

/** Every change to one account's tokens or loan, newest first. */
export async function loadLedger(userId: string): Promise<LedgerEntry[]> {
  const rows = await getDb()
    .select({
      id: tokenLedger.id,
      at: tokenLedger.createdAt,
      tokensDelta: tokenLedger.tokensDelta,
      loanDelta: tokenLedger.loanDelta,
      kind: tokenLedger.kind,
      by: actor.name,
    })
    .from(tokenLedger)
    .leftJoin(actor, eq(actor.id, tokenLedger.actorId))
    .where(eq(tokenLedger.userId, userId))
    .orderBy(desc(tokenLedger.createdAt));
  return rows.map((r) => ({
    ...r,
    kind: r.kind === "loan" ? "loan" : "adjustment",
  }));
}

/**
 * Who to hand tokens to: unbanned accounts holding magnum_opus.manage. Admins
 * hold it implicitly, so they're left off unless they hold it explicitly too.
 */
export async function listTokenVolunteers(): Promise<string[]> {
  const ids = await holdersOf("magnum_opus.manage");
  if (ids.length === 0) return [];
  const rows = await getDb()
    .select({ name: user.name })
    .from(user)
    .where(and(inArray(user.id, ids), eq(user.banned, false)));
  return rows.map((r) => r.name).sort((a, b) => a.localeCompare(b));
}
