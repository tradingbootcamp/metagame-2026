import { eq, inArray, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { AdminAccount } from "@/lib/admin-tickets";
import { emailKey } from "@/lib/ticket-holder";
import { accountName } from "@/lib/schedule-store";
import type { TicketRow } from "@/lib/ticket-store";

const { user, profiles } = schema;

/** The accounts a set of tickets mentions, by id and by email. */
export async function ticketAccounts(rows: TicketRow[]): Promise<{
  accounts: Map<string, AdminAccount>;
  byEmail: Map<string, AdminAccount>;
}> {
  const ids = [
    ...new Set(
      rows
        .flatMap((t) => [t.holderUserId, t.ownerUserId])
        .filter((x) => x !== null),
    ),
  ];
  const emails = [
    ...new Set(rows.map((t) => t.purchaserEmail).filter((x) => x !== null)),
  ];
  const found =
    ids.length + emails.length === 0
      ? []
      : await getDb()
          .select({ id: user.id, name: accountName, email: user.email })
          .from(user)
          .leftJoin(profiles, eq(profiles.userId, user.id))
          .where(
            or(
              ids.length ? inArray(user.id, ids) : undefined,
              emails.length
                ? inArray(sql`lower(${user.email})`, emails)
                : undefined,
            ),
          );
  return {
    accounts: new Map(found.map((a) => [a.id, a])),
    byEmail: new Map(found.map((a) => [emailKey(a.email), a])),
  };
}
