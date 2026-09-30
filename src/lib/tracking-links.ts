import { env } from "@/env";
import { airtableConfig } from "@/lib/airtable-config";

// Short links: /go/{slug} → Destination with the row's UTMs appended. Rows live
// in the Airtable "Tracking Links" table and are created from /admin/links.

export type TrackingLink = {
  id: string;
  slug: string;
  destination: string;
  source: string;
  medium: string;
  campaign: string;
  placement: string;
  internalName: string;
  createdBy: string;
  createdAt: string;
  active: boolean;
  template: boolean;
};

export type NewTrackingLink = Omit<
  TrackingLink,
  "id" | "createdAt" | "active" | "template"
>;

export const MEDIUMS = ["community", "email", "social", "referral"] as const;
export const DEFAULT_CAMPAIGN = "metagame-2026";
export const GO_PREFIX = "/go/";

const SLUG_MIN = 3;
const SLUG_MAX = 48;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

/** Lowercased, whitespace → hyphens, runs collapsed. Doesn't drop other characters — see `validateSlug`. */
export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-").replace(/-{2,}/g, "-");
}

export function validateSlug(slug: string): string | null {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX)
    return `Short name must be ${SLUG_MIN}–${SLUG_MAX} characters.`;
  if (!SLUG_RE.test(slug))
    return "Short name can only use lowercase letters, digits, and hyphens (not at the ends).";
  return null;
}

/** UTM value: trimmed, lowercased, whitespace → hyphens. Empty when nothing's left. */
export function normalizeUtmValue(input: string): string {
  return normalizeSlug(input).slice(0, 100);
}

export function validateUtmValue(value: string): string | null {
  return /^[a-z0-9_-]+$/.test(value)
    ? null
    : "Use only letters, digits, hyphens, and underscores.";
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Only https on the site's own origin, and never back into /go/. */
export function isAllowedDestination(
  destination: string,
  siteOrigin: string,
): boolean {
  let url: URL;
  let site: URL;
  try {
    url = new URL(destination);
    site = new URL(siteOrigin);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    return false;
  if (url.host !== site.host) return false;
  if (
    url.pathname === GO_PREFIX.slice(0, -1) ||
    url.pathname.startsWith(GO_PREFIX)
  )
    return false;
  return true;
}

/** Destination with this link's UTMs, replacing any it already carried. Other params and the fragment survive. */
export function buildDestinationUrl(
  link: Pick<
    TrackingLink,
    "destination" | "slug" | "source" | "medium" | "campaign" | "placement"
  >,
): string {
  const url = new URL(link.destination);
  for (const key of UTM_PARAMS) url.searchParams.delete(key);
  url.searchParams.set("utm_source", link.source);
  url.searchParams.set("utm_medium", link.medium);
  url.searchParams.set("utm_campaign", link.campaign);
  if (link.placement) url.searchParams.set("utm_content", link.placement);
  url.searchParams.set("utm_term", link.slug);
  return url.toString();
}

export function shortUrl(siteOrigin: string, slug: string): string {
  return `${siteOrigin.replace(/\/$/, "")}${GO_PREFIX}${slug}`;
}

// --- Airtable ---

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

const text = (v: unknown) => (typeof v === "string" ? v : "");

function toLink(record: AirtableRecord): TrackingLink {
  const f = record.fields;
  return {
    id: record.id,
    slug: text(f.Slug),
    destination: text(f.Destination),
    source: text(f.Source),
    medium: text(f.Medium),
    campaign: text(f.Campaign),
    placement: text(f.Placement),
    internalName: text(f["Internal Name"]),
    createdBy: text(f["Created By"]),
    createdAt: record.createdTime,
    active: f.Active === true,
    template: f.Template === true,
  };
}

function tableUrl() {
  return `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.trackingLinksTableId)}`;
}

async function airtable(url: string, init?: RequestInit) {
  const { AIRTABLE_API_KEY } = env;
  if (!AIRTABLE_API_KEY) throw new Error("Airtable is not configured");
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Every link, newest first. */
export async function listTrackingLinks(): Promise<TrackingLink[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const page = (await airtable(`${tableUrl()}?${params}`)) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records
    .map(toLink)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const escapeFormula = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export async function findTrackingLink(
  slug: string,
): Promise<TrackingLink | null> {
  const params = new URLSearchParams({
    filterByFormula: `LOWER({Slug})='${escapeFormula(slug)}'`,
    maxRecords: "1",
  });
  const page = (await airtable(`${tableUrl()}?${params}`)) as {
    records: AirtableRecord[];
  };
  return page.records[0] ? toLink(page.records[0]) : null;
}

export async function createTrackingLink(
  link: NewTrackingLink,
): Promise<TrackingLink> {
  const fields: Record<string, unknown> = {
    Slug: link.slug,
    Destination: link.destination,
    Source: link.source,
    Medium: link.medium,
    Campaign: link.campaign,
    "Created By": link.createdBy,
    Active: true,
  };
  if (link.placement) fields.Placement = link.placement;
  if (link.internalName) fields["Internal Name"] = link.internalName;
  const created = (await airtable(tableUrl(), {
    method: "POST",
    body: JSON.stringify({ records: [{ fields }] }),
  })) as { records: AirtableRecord[] };
  return toLink(created.records[0]);
}

// Redirect lookups are cached briefly per server instance: a link posted in a
// busy channel gets a burst of preview-bot hits, and Airtable's rate limit is
// 5 req/s per base.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; link: TrackingLink | null }>();

export async function resolveTrackingLink(
  slug: string,
): Promise<TrackingLink | null> {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.link;
  const link = await findTrackingLink(slug);
  cache.set(slug, { at: Date.now(), link });
  return link;
}
