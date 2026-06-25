import { env } from "@/env";
import { airtableConfig } from "@/lib/airtable-config";
import { ticketTiers } from "@/lib/tickets";

// Full BTC price of the standard ticket; discounts are resolved relative to it.
const FULL_BTC =
  ticketTiers.find((t) => t.id === "standard")?.prices.full.btc ?? 0.0065;

export type DiscountCode = {
  code: string;
  btcPrice: number; // the discounted BTC price this code charges
  label?: string;
};

/**
 * Look up an active discount code in the Airtable "Discount Codes" table — the
 * ground truth for what a code charges. Returns null for an unknown/inactive code,
 * an unconfigured Airtable, or any failure, so the caller falls back to full price.
 * Never throws into the request path: a bad code only ever charges *full*, not less.
 */
export async function lookupDiscountCode(
  code: string,
): Promise<DiscountCode | null> {
  const { AIRTABLE_API_KEY } = env;
  if (!AIRTABLE_API_KEY) return null;

  // Uppercase + strip to [A-Z0-9-]. This both normalizes to the stored form and
  // neutralizes filterByFormula injection (no quotes/parens survive sanitizing).
  const safe = code.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!safe) return null;

  const formula = `AND(UPPER({Code})='${safe}',{Active})`;
  const url =
    `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.discountCodesTableId)}` +
    `?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[discount] Airtable responded ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      records?: { fields?: Record<string, unknown> }[];
    };
    const fields = data.records?.[0]?.fields;
    if (!fields) return null;

    const discountType = fields["Discount Type"];
    const value = Number(fields["Value"]);
    if (typeof discountType !== "string" || !Number.isFinite(value))
      return null;

    let price: number;
    switch (discountType) {
      case "End price":
        price = value;
        break;
      case "Amount off":
        price = FULL_BTC - value;
        break;
      case "Percent off":
        price = FULL_BTC * (1 - value / 100);
        break;
      default:
        return null;
    }

    // Round to whole-satoshi precision so percent/amount math displays cleanly.
    const btcPrice = Math.round(price * 1e8) / 1e8;
    // A discount can only lower the price within (0, full]; anything else is invalid.
    if (!Number.isFinite(btcPrice) || btcPrice <= 0 || btcPrice > FULL_BTC) {
      return null;
    }

    const label = fields["Label"];
    return {
      code: safe,
      btcPrice,
      label: typeof label === "string" && label ? label : undefined,
    };
  } catch (err) {
    console.warn("[discount] lookup failed:", err);
    return null;
  }
}
