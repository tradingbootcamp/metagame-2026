import { env } from "@/env";
import { airtableConfig } from "@/lib/airtable-config";
import {
  identityOf,
  MAX_SLUG_ATTEMPTS,
  normalizeCustomCode,
  normalizeName,
  normalizePurpose,
  normalizeUses,
  PROMO_SOURCE,
  PromoError,
  seedOf,
  slugCode,
  type MintInput,
  type MintResult,
  type Prior,
} from "@/lib/promo-codes";
import { promoMode } from "@/lib/stripe-promo";

// The Bitcoin rail: a code is a Method=BTC row in the "Discount Codes" table,
// which lookupDiscountCode() (src/lib/discount-codes.ts) validates against.
// Method=Stripe rows in the same table are the stripe-webhook's mirror and are
// never read or written here. Max Uses is enforced by the BTC checkout
// (counting non-failed BTC purchases); nothing is decremented.

export type BtcCode = {
  code: string;
  name: string;
  email: string;
  purpose: string;
  notes: string;
  max: number | null;
  active: boolean;
  archived: boolean;
  test: boolean;
  created: number | null;
};

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

// Our rows carry this marker in Notes; anything without it (EARLYBIRD, …) is
// a real discount this tool must never clobber. The stripe-webhook's marker
// deliberately doesn't contain it.
const isCompRow = (rec: AirtableRecord) =>
  String(rec.fields.Notes ?? "")
    .toLowerCase()
    .includes(PROMO_SOURCE);

const LABEL_PREFIX = "Comp – ";
const nameFromLabel = (label: unknown) =>
  typeof label === "string" && label.startsWith(LABEL_PREFIX)
    ? label.slice(LABEL_PREFIX.length)
    : "";

const text = (v: unknown) => (typeof v === "string" ? v : "");
const unixSeconds = (iso: string | undefined) =>
  iso ? Math.floor(Date.parse(iso) / 1000) : null;

const tableUrl = () =>
  `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.discountCodesTableId)}`;

async function airtable(url: string, init?: RequestInit) {
  const { AIRTABLE_API_KEY } = env;
  if (!AIRTABLE_API_KEY)
    throw new PromoError("Airtable is not configured", "config");
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok)
    throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
  return res.json();
}

async function findByCode(code: string): Promise<AirtableRecord | null> {
  // Codes are [A-Z0-9_-] after normalizing, so nothing survives that could
  // break out of the formula string.
  const safe = code.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!safe) return null;
  const params = new URLSearchParams({
    filterByFormula: `AND(UPPER({Code})='${safe}',{Method}!='Stripe')`,
    maxRecords: "1",
  });
  const page = (await airtable(`${tableUrl()}?${params}`)) as {
    records: AirtableRecord[];
  };
  return page.records[0] ?? null;
}

async function writeRow({
  code,
  email,
  name,
  maxUses,
  purpose,
  notes,
}: {
  code: string;
  email: string;
  name: string;
  maxUses: number | null;
  purpose: string;
  notes: string;
}): Promise<void> {
  await airtable(tableUrl(), {
    method: "PATCH",
    body: JSON.stringify({
      // Code+Method, not Code alone: a code minted on both rails keeps two
      // independent rows (see recordDiscountCode in airtable.ts).
      performUpsert: { fieldsToMergeOn: ["Code", "Method"] },
      typecast: true,
      records: [
        {
          fields: {
            Code: code,
            Method: "BTC",
            Active: true,
            "Percent Off": 100,
            // null clears the field = blank = unlimited.
            "Max Uses": maxUses,
            Label: `${LABEL_PREFIX}${name}`,
            Email: email || undefined,
            Purpose: purpose,
            // Omitted when blank so a re-run can't wipe an existing note.
            "Comp Notes": notes || undefined,
            Notes: `Comped via ${PROMO_SOURCE}${email ? ` for ${email}` : ""}`,
            Archived: false,
            Test: promoMode() === "test",
          },
        },
      ],
    }),
  });
}

export async function mintBtcCode(input: MintInput): Promise<MintResult> {
  const name = normalizeName(input.name);
  const purpose = normalizePurpose(input.purpose);
  const email = (input.email ?? "").trim();
  const notes = (input.notes ?? "").trim();
  const uses = normalizeUses(input.maxUses);
  const want = identityOf({ email, name });

  type Probe =
    | { status: "free" }
    | { status: "mine"; prior: Prior }
    | { status: "taken" };
  const probe = async (code: string): Promise<Probe> => {
    const existing = await findByCode(code);
    if (!existing) return { status: "free" };
    if (!isCompRow(existing)) return { status: "taken" };
    const f = existing.fields;
    const owner = identityOf({
      email: text(f.Email),
      name: nameFromLabel(f.Label),
    });
    if (want && owner !== want) return { status: "taken" };
    return {
      status: "mine",
      prior: {
        name: nameFromLabel(f.Label),
        email: text(f.Email),
        purpose: text(f.Purpose),
        created: unixSeconds(existing.createdTime),
      },
    };
  };

  const finalize = async (code: string, r: Probe): Promise<MintResult> => {
    await writeRow({ code, email, name, maxUses: uses, purpose, notes });
    return {
      rail: "btc",
      code,
      name,
      email,
      reused: r.status === "mine",
      prior: r.status === "mine" ? r.prior : undefined,
      max: uses,
      purpose,
      test: promoMode() === "test",
    };
  };

  const custom = normalizeCustomCode(input.customCode);
  if (custom) {
    const r = await probe(custom);
    if (r.status === "taken")
      throw new PromoError(
        `Code ${custom} already exists as a real discount or for a different guest — pick another custom code`,
        "collision",
      );
    return finalize(custom, r);
  }

  const seed = seedOf({ email, name });
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const code = slugCode(seed, attempt);
    const r = await probe(code);
    if (r.status !== "taken") return finalize(code, r);
  }
  throw new PromoError(
    "Could not find a free code after several attempts — try a custom code",
    "exhausted",
  );
}

/** Every tool-written BTC row, newest first. Read-only: BTC rows are archived in Airtable. */
export async function listBtcCodes(): Promise<BtcCode[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({
      filterByFormula: `AND({Method}='BTC', FIND('${PROMO_SOURCE}', LOWER({Notes})))`,
      pageSize: "100",
    });
    if (offset) params.set("offset", offset);
    const page = (await airtable(`${tableUrl()}?${params}`)) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records
    .map((rec) => {
      const f = rec.fields;
      const max = f["Max Uses"];
      return {
        code: text(f.Code),
        name: nameFromLabel(f.Label),
        email: text(f.Email),
        purpose: text(f.Purpose),
        notes: text(f["Comp Notes"]),
        max: typeof max === "number" ? max : null,
        active: f.Active === true,
        archived: f.Archived === true,
        test: f.Test === true,
        created: unixSeconds(rec.createdTime),
      };
    })
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
}
