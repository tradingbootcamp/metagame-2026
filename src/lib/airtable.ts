import { env } from "@/env";
import { airtableConfig } from "@/lib/airtable-config";
import { EMAIL_LIST_VALUE, type InterestValue } from "@/lib/interests";

export type SignupResult = { stored: boolean; reason?: string };

// Interest Intake tags each row by Type of Interest; every splash signup gets the
// "email list" option. Written by name (the API rejects option ids on write); typecast
// keeps signups working if it's relabeled — but update this to match, or a stray option
// gets recreated.
const INTEREST_FIELD = "Type of Interest";

// Interest Intake's primary field. Optional on the form, so only sent when provided
// (avoids overwriting an existing name with a blank on a repeat submit).
const NAME_FIELD = "Name";
// Free-text "anything else" from the follow-up form.
const NOTES_FIELD = "Notes";
// Marks dev/test submissions so they're filterable from real signups.
const TEST_FIELD = "Test";

type SignupFields = {
  name?: string;
  interests?: InterestValue[];
  notes?: string;
};

/**
 * Upsert an email into the Airtable signups table, keyed on the email field so
 * a repeat submission updates rather than duplicates. Uses `performUpsert`, so
 * it dedupes server-side with only `data.records:write` scope — no read needed.
 *
 * Both the initial signup and the optional interest follow-up call this: the
 * follow-up re-sends the same email plus `interests`/`notes`, and the upsert
 * merges them onto the existing row. An upsert PATCH *replaces* the multi-select,
 * so we always re-include "email list" to keep the original tag.
 *
 * If Airtable isn't configured yet (no token / base / table), this no-ops with
 * a warning so local dev still works — the splash form succeeds, the email just
 * isn't persisted.
 */
export async function recordSignup(
  email: string,
  { name, interests = [], notes }: SignupFields = {},
): Promise<SignupResult> {
  const { AIRTABLE_API_KEY } = env;

  if (!AIRTABLE_API_KEY) {
    console.warn(`[signup] Airtable not configured — not stored: ${email}`);
    return { stored: false, reason: "airtable-not-configured" };
  }

  const fields: Record<string, unknown> = {
    [airtableConfig.signupEmailField]: email,
    [INTEREST_FIELD]: Array.from(new Set([EMAIL_LIST_VALUE, ...interests])),
    [TEST_FIELD]: process.env.NODE_ENV !== "production",
  };
  if (name) fields[NAME_FIELD] = name;
  if (notes) fields[NOTES_FIELD] = notes;

  const res = await fetch(
    `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.signupsTableId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: [airtableConfig.signupEmailField] },
        records: [{ fields }],
        typecast: true,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
  }

  return { stored: true };
}

/**
 * Flip an already-recorded purchase to Failed, keyed on the payment id (= the
 * upsert key recordPurchase uses). No-ops when no row exists yet — a charge that
 * never reached `processing` was never recorded and so never counted as a
 * redemption, leaving nothing to heal. Idempotent: re-running just re-sets Failed.
 * Updates by record id (not an upsert) so it can never create a row.
 */
export async function markPurchaseFailedIfExists(
  paymentId: string,
): Promise<boolean> {
  const { AIRTABLE_API_KEY } = env;
  if (!AIRTABLE_API_KEY) {
    console.warn(
      `[purchase] Airtable not configured — cannot mark failed: ${paymentId}`,
    );
    return false;
  }

  // OpenNode charge ids are hex + dashes; strip anything else to neutralize
  // filterByFormula injection.
  const safe = paymentId.replace(/[^0-9a-fA-F-]/g, "");
  if (!safe) return false;

  const tableUrl = `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.purchasesTableId)}`;

  const findRes = await fetch(
    `${tableUrl}?filterByFormula=${encodeURIComponent(`{ID}='${safe}'`)}&maxRecords=1`,
    { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } },
  );
  if (!findRes.ok) {
    throw new Error(
      `Airtable responded ${findRes.status}: ${await findRes.text()}`,
    );
  }
  const found = (await findRes.json()) as { records?: { id: string }[] };
  const recordId = found.records?.[0]?.id;
  if (!recordId) return false;

  const failed: PurchaseStatus = "Failed";
  const patchRes = await fetch(tableUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ id: recordId, fields: { Status: failed } }],
    }),
  });
  if (!patchRes.ok) {
    throw new Error(
      `Airtable responded ${patchRes.status}: ${await patchRes.text()}`,
    );
  }
  return true;
}

// Lifecycle of a purchase. Card → Paid instantly; ACH bank debits land Pending
// then settle to Paid (or bounce to Failed) days later. BTC charges land Pending
// (on-chain processing) then settle to Paid, or land Underpaid. "Underpaid" is a
// new singleSelect option auto-created by the upsert's typecast.
export type PurchaseStatus = "Pending" | "Paid" | "Failed" | "Underpaid";

export type PurchaseRecord = {
  id: string; // payment id (Stripe payment / OpenNode charge) — the upsert key, so redelivered events dedupe
  status: PurchaseStatus;
  test: boolean; // true for test-mode (sandbox) purchases — checks the Test box
  paymentMethod: "stripe" | "btc";
  customerName?: string;
  customerEmail?: string;
  amount?: number; // dollars (Airtable currency field)
  btcAmount?: number; // whole BTC paid (only set for BTC purchases)
  fee?: number;
  net?: number;
  billingName?: string;
  billingEmail?: string;
  ticketType?: string;
  couponCode?: string; // promotion code the buyer used, e.g. "EARLYBIRD"
  amountDiscount?: number; // dollars knocked off by the coupon
  btcAmountDiscounted?: number; // whole BTC knocked off by a BTC discount code
  receiptUrl?: string;
  notes?: string;
  discordHandle?: string; // Discord Username custom field from the Payment Link checkout
  openNodeOrderId?: string;
  btcTxId?: string;
  hostedCheckoutUrl?: string;
  networkFeeBtc?: number;
  settledFiatValue?: number;
  btcNetwork?: "On-chain" | "Lightning";
};

/**
 * Upsert a ticket purchase into the Airtable "Stripe Purchases" table, keyed on
 * the Stripe payment id so Stripe's at-least-once webhook redelivery can't create
 * duplicate rows. No-ops with a warning when Airtable isn't configured, mirroring
 * recordSignup. Only fields we actually have are sent, so blanks never clobber.
 */
export async function recordPurchase(
  purchase: PurchaseRecord,
): Promise<SignupResult> {
  const { AIRTABLE_API_KEY } = env;

  if (!AIRTABLE_API_KEY) {
    console.warn(
      `[purchase] Airtable not configured — not stored: ${purchase.id}`,
    );
    return { stored: false, reason: "airtable-not-configured" };
  }

  const fields: Record<string, unknown> = {
    ID: purchase.id,
    Status: purchase.status,
    Test: purchase.test,
    "Payment Method": purchase.paymentMethod === "btc" ? "BTC" : "Stripe",
  };
  if (purchase.btcAmount != null) fields["BTC Amount"] = purchase.btcAmount;
  if (purchase.customerName) fields["Customer Name"] = purchase.customerName;
  if (purchase.customerEmail) fields["Customer Email"] = purchase.customerEmail;
  if (purchase.amount != null) fields["Amount"] = purchase.amount;
  if (purchase.fee != null) fields["Balance Transaction Fee"] = purchase.fee;
  if (purchase.net != null) fields["Balance Transaction Net"] = purchase.net;
  if (purchase.billingName)
    fields["Billing Details Name"] = purchase.billingName;
  if (purchase.billingEmail)
    fields["Billing Details Email"] = purchase.billingEmail;
  if (purchase.ticketType) fields["Ticket Type"] = purchase.ticketType;
  if (purchase.couponCode) fields["Coupon Code"] = purchase.couponCode;
  if (purchase.amountDiscount != null)
    fields["Amount Discounted"] = purchase.amountDiscount;
  if (purchase.btcAmountDiscounted != null && purchase.btcAmountDiscounted > 0)
    fields["BTC Amount Discounted"] = purchase.btcAmountDiscounted;
  if (purchase.receiptUrl) fields["Receipt URL"] = purchase.receiptUrl;
  if (purchase.notes) fields["Notes"] = purchase.notes;
  if (purchase.discordHandle) fields["Discord Handle"] = purchase.discordHandle;
  if (purchase.openNodeOrderId)
    fields["OpenNode Order ID"] = purchase.openNodeOrderId;
  if (purchase.btcTxId) fields["BTC Tx ID"] = purchase.btcTxId;
  if (purchase.hostedCheckoutUrl)
    fields["Hosted Checkout URL"] = purchase.hostedCheckoutUrl;
  if (purchase.networkFeeBtc != null)
    fields["Network Fee (BTC)"] = purchase.networkFeeBtc;
  if (purchase.settledFiatValue != null)
    fields["Settled Fiat Value"] = purchase.settledFiatValue;
  if (purchase.btcNetwork) fields["BTC Network"] = purchase.btcNetwork;

  const res = await fetch(
    `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.purchasesTableId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: ["ID"] },
        records: [{ fields }],
        typecast: true,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
  }

  return { stored: true };
}

export type DiscountCodeRecord = {
  code: string;
  active: boolean;
  test: boolean; // true for test-mode (sandbox) codes — checks the Test box
  maxUses: number | null; // redemption cap; null clears the field (uncapped)
  percentOff?: number; // e.g. 100 = 100% off
  usdOff?: number; // dollars off (Airtable currency field)
  email?: string;
  label?: string;
};

/**
 * Mirror a Stripe promotion code into the Airtable "Discount Codes" table as a
 * Method=Stripe row, so every code (Stripe + BTC) lives in one table. The
 * stripe-webhook is the sole writer of Method=Stripe rows. No-ops with a warning
 * when Airtable isn't configured, mirroring recordPurchase.
 */
export async function recordDiscountCode(
  record: DiscountCodeRecord,
): Promise<SignupResult> {
  const { AIRTABLE_API_KEY } = env;

  if (!AIRTABLE_API_KEY) {
    console.warn(
      `[discount] Airtable not configured — not stored: ${record.code}`,
    );
    return { stored: false, reason: "airtable-not-configured" };
  }

  const fields: Record<string, unknown> = {
    Code: record.code.toUpperCase(),
    Method: "Stripe",
    Active: record.active,
    Archived: !record.active,
    Test: record.test,
    // Explicit null clears a stale cap when the promo is uncapped (omitting would keep it).
    "Max Uses": record.maxUses,
    // Marker must NOT contain "comp-tool" — the comp tool keys its own rows off that substring.
    Notes: "Stripe promo (stripe-webhook)",
  };
  // Exactly one per-unit column is populated per code (the other stays blank).
  if (record.percentOff != null) fields["Percent Off"] = record.percentOff;
  if (record.usdOff != null) fields["USD Off"] = record.usdOff;
  // Only set Email/Label when present so a repeat event can't blank an existing value.
  if (record.email) fields.Email = record.email;
  if (record.label) fields.Label = record.label;

  const res = await fetch(
    `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.discountCodesTableId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Code+Method, not Code alone: a deterministic comp code can also exist as a
        // Method=BTC row, and merging on Code would clobber it.
        performUpsert: { fieldsToMergeOn: ["Code", "Method"] },
        records: [{ fields }],
        typecast: true,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
  }

  return { stored: true };
}
