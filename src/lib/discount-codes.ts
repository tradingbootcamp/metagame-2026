import { env } from "@/env";
import { airtableConfig } from "@/lib/airtable-config";

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

    const btcPrice = Number(fields["BTC Price"]);
    if (!Number.isFinite(btcPrice) || btcPrice <= 0) return null;

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
