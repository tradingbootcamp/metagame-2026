import { env } from "@/env";
import { airtableConfig } from "@/lib/airtable-config";
import {
  CHILD_FIELDS,
  FAMILY_FIELDS,
  SESSION_NAMES,
} from "@/v2/forms/children";

export type Family = {
  recordId: string;
  createdTime: string;
  parentName: string;
  relationship: string;
  email: string;
  phone: string;
  discord: string;
  /** How many children the form said were coming. */
  count: number | null;
  /** Free text about the fifth child onward; can't be split into rows. */
  moreChildren: string;
  anythingElse: string;
};

export type ChildEntry = {
  /** Record id plus the child's slot, unique across the table. */
  key: string;
  name: string;
  age: number | null;
  sessions: string[];
  medical: string;
  notes: string;
  family: Family;
};

export type ChildrenData = {
  children: ChildEntry[];
  /** Families whose "more children" text or declared count has no rows. */
  families: Family[];
};

export const CHILDCARE_MIN_AGE = 5;
export const CHILDCARE_MAX_AGE = 12;

export const SESSION_SHORT: Record<string, string> = {
  [SESSION_NAMES[0]]: "Fri PM",
  [SESSION_NAMES[1]]: "Sat AM",
  [SESSION_NAMES[2]]: "Sat PM",
  [SESSION_NAMES[3]]: "Sun AM",
  [SESSION_NAMES[4]]: "Sun PM",
};
export const sessionShort = (s: string) => SESSION_SHORT[s] ?? "Other";

export const needsChildcare = (c: { sessions: string[] }) =>
  c.sessions.length > 0;
export const outsideChildcareAges = (age: number | null) =>
  age !== null && (age < CHILDCARE_MIN_AGE || age > CHILDCARE_MAX_AGE);

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (typeof v === "number" ? v : null);
const list = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function toFamily(r: AirtableRecord): Family {
  const f = r.fields;
  return {
    recordId: r.id,
    createdTime: r.createdTime,
    parentName: text(f[FAMILY_FIELDS.name]),
    relationship: text(f[FAMILY_FIELDS.relationship]),
    email: text(f[FAMILY_FIELDS.email]),
    phone: text(f[FAMILY_FIELDS.phone]),
    discord: text(f[FAMILY_FIELDS.discord]),
    count: num(f[FAMILY_FIELDS.count]),
    moreChildren: text(f[FAMILY_FIELDS.moreChildren]),
    anythingElse: text(f[FAMILY_FIELDS.anythingElse]),
  };
}

function toChildren(r: AirtableRecord, family: Family): ChildEntry[] {
  const out: ChildEntry[] = [];
  CHILD_FIELDS.forEach(([name, age, times, medical, other], i) => {
    const f = r.fields;
    const childName = text(f[name]);
    const childAge = num(f[age]);
    if (!childName && childAge === null) return;
    out.push({
      key: `${r.id}:${i}`,
      name: childName || "(unnamed)",
      age: childAge,
      sessions: list(f[times]),
      medical: text(f[medical]),
      notes: text(f[other]),
      family,
    });
  });
  return out;
}

/** Every registered child, newest registrations first. */
export async function loadChildren(): Promise<ChildrenData> {
  const { AIRTABLE_API_KEY } = env;
  if (!AIRTABLE_API_KEY) throw new Error("AIRTABLE_API_KEY isn't set.");
  const base = `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.childrenTableId)}`;

  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({
      pageSize: "100",
      returnFieldsByFieldId: "true",
    });
    if (offset) params.set("offset", offset);
    const res = await fetch(`${base}?${params}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    if (!res.ok) {
      throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
    }
    const page = (await res.json()) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...page.records);
    offset = page.offset;
  } while (offset);

  records.sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  const children: ChildEntry[] = [];
  const families: Family[] = [];
  for (const r of records) {
    const family = toFamily(r);
    const rows = toChildren(r, family);
    children.push(...rows);
    if (family.moreChildren || (family.count ?? 0) > rows.length) {
      families.push(family);
    }
  }
  return { children, families };
}
