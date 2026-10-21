// One-time backfill of the tickets table from the Airtable "Stripe Purchases"
// table, for purchases made before the webhooks wrote to Postgres. Idempotent:
// upserts on payment id and never touches owner_user_id / claimed_at, so it is
// safe to re-run. Prints what it would write; pass --apply to write.
//
//   node scripts/backfill-tickets.mjs [--apply]
//
// Needs AIRTABLE_API_KEY and DATABASE_URL (from .env.local when unset).
import { neon } from "@neondatabase/serverless";
import { airtableConfig } from "../src/lib/airtable-config.ts";
import { ticketCode } from "../src/lib/ticket-code.ts";

try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local
}

const apply = process.argv.includes("--apply");
const { AIRTABLE_API_KEY, DATABASE_URL } = process.env;
if (!AIRTABLE_API_KEY || !DATABASE_URL) {
  console.error("AIRTABLE_API_KEY and DATABASE_URL are required");
  process.exit(1);
}

const STATUS = {
  Pending: "pending",
  Paid: "paid",
  Failed: "failed",
  Underpaid: "underpaid",
};

async function* purchases() {
  const url = new URL(
    `https://api.airtable.com/v0/${airtableConfig.baseId}/${airtableConfig.purchasesTableId}`,
  );
  for (const f of [
    "ID",
    "Status",
    "Test",
    "Payment Method",
    "Customer Name",
    "Preferred Name",
    "Customer Email",
    "Amount",
    "Ticket Type",
    "Ticket Code",
  ]) {
    url.searchParams.append("fields[]", f);
  }
  let offset;
  do {
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    if (!res.ok) {
      throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
    }
    const page = await res.json();
    yield* page.records.map((r) => r.fields);
    offset = page.offset;
  } while (offset);
}

const rows = [];
const skipped = [];
for await (const f of purchases()) {
  const paymentId = f.ID?.trim();
  const status = STATUS[f.Status];
  if (!paymentId || !status) {
    skipped.push(`${paymentId ?? "(no ID)"}: status ${f.Status ?? "(none)"}`);
    continue;
  }
  rows.push({
    paymentId,
    ticketCode: f["Ticket Code"]?.trim() || ticketCode(paymentId),
    source: f["Payment Method"] === "BTC" ? "opennode" : "stripe",
    status,
    test: f.Test === true,
    tier: f["Ticket Type"] ?? null,
    amountCents: f.Amount != null ? Math.round(f.Amount * 100) : null,
    purchaserEmail: f["Customer Email"]?.trim().toLowerCase() || null,
    purchaserName: f["Preferred Name"] ?? f["Customer Name"] ?? null,
  });
}

console.log(`${rows.length} purchases to upsert, ${skipped.length} skipped`);
for (const s of skipped) console.log(`  skip ${s}`);
if (!apply) {
  for (const r of rows) {
    console.log(
      `  ${r.paymentId} ${r.status} ${r.ticketCode} ${r.purchaserEmail ?? "-"}`,
    );
  }
  console.log("Dry run. Pass --apply to write.");
  process.exit(0);
}

const sql = neon(DATABASE_URL);
for (const r of rows) {
  await sql`
    insert into tickets (payment_id, ticket_code, source, status, test, tier,
      amount_cents, purchaser_email, purchaser_name)
    values (${r.paymentId}, ${r.ticketCode}, ${r.source}, ${r.status}, ${r.test},
      ${r.tier}, ${r.amountCents}, ${r.purchaserEmail}, ${r.purchaserName})
    on conflict (payment_id) do update set
      status = excluded.status,
      test = excluded.test,
      tier = coalesce(excluded.tier, tickets.tier),
      amount_cents = coalesce(excluded.amount_cents, tickets.amount_cents),
      purchaser_email = coalesce(excluded.purchaser_email, tickets.purchaser_email),
      purchaser_name = coalesce(excluded.purchaser_name, tickets.purchaser_name),
      updated_at = now()
  `;
}
console.log(`Upserted ${rows.length} tickets.`);
