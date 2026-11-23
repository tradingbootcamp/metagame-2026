import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { tickets } = schema;

const record = (id: string) => eq(tickets.paymentId, id);

/** False when there's no such ticket or it's already voided. */
export async function voidTicket(id: string, by: string): Promise<boolean> {
  const rows = await getDb()
    .update(tickets)
    .set({ voided: true, voidedAt: new Date(), voidedBy: by })
    .where(and(record(id), eq(tickets.voided, false)))
    .returning({ id: tickets.paymentId });
  return rows.length > 0;
}

/** False when there's no such ticket or it isn't voided. */
export async function unvoidTicket(id: string, by: string): Promise<boolean> {
  const rows = await getDb()
    .update(tickets)
    .set({ voided: false, unvoidedAt: new Date(), unvoidedBy: by })
    .where(and(record(id), eq(tickets.voided, true)))
    .returning({ id: tickets.paymentId });
  return rows.length > 0;
}
