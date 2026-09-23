import { env } from "@/env";
import { airtableConfig } from "@/lib/airtable-config";

// Fields are addressed by name, like the rest of src/lib/airtable.ts. Renaming a
// column in Airtable breaks the matching entry here, so rename in both places.
// The option lists mirror each select's choices; a value not in the list is
// dropped on save (we send typecast:false, so a stray value would 422 anyway
// rather than quietly inventing a new option).

export const RUBRIC_GRADES = ["Best", "Good", "Meh", "Bad", "Unclear"] as const;
export type RubricGrade = (typeof RUBRIC_GRADES)[number];

/** The five scored metrics, with the rubric text graders are scoring against. */
export const RUBRIC_METRICS = [
  {
    field: "Rubric: Operational Ease",
    label: "Operational ease",
    guidance: {
      Best: "Few or no equipment/supply needs; flexible space/setup requirements; no cash outlay required; easy to slot in among other sessions",
      Good: "Easy-to-procure / inexpensive supplies required; modest setup needs; hard requirements for space that are reasonably easy to provide",
      Meh: "Requires significant supplies (in terms of cost or amount); extensive equipment needs or lengthy setup time; needs to occupy a large space for a long time for a small audience",
      Bad: "Excessive resources required in terms of setup, cost, and/or procurement; assumes a feature that does not exist",
    },
  },
  {
    field: "Rubric: Host Competence",
    label: "Host competence",
    guidance: {
      Best: "Highly charismatic / energetic / engaging speaker",
      Good: "Relatively charismatic and engaging speaker; has hosted multiple con sessions",
      Meh: "Enthusiast with little expertise; has 1–2 prior con hosting gigs, but low charisma",
      Bad: "First-time presenter; tenuous grasp of subject; boring presenter",
    },
  },
  {
    field: "Rubric: Host Name Recognition",
    label: "Host name recognition",
    guidance: {
      Best: "“Star” status; high name recognition among general public; known expert in field; someone we should accommodate due to status",
      Good: "Possesses name recognition among enthusiasts; has extensive experience in field",
      Meh: "Low name recognition",
      Bad: "Negative name recognition; unknown or somewhat actively disliked",
    },
  },
  {
    field: "Rubric: Subject Matter",
    label: "Subject matter",
    guidance: {
      Best: "Popular topic or game with a large enthusiast community; fills a void that would otherwise be empty; low barriers to participation for beginners",
      Good: "Niche topic with a small group of die-hard enthusiasts, or a game/topic with broad general interest but few die-hard devotees; reasonably accessible to game fans",
      Meh: "Complex game that would require “in-the-know” attendees to work; topic that is on-brand but not particularly interesting or fun; new game of unknown quality",
      Bad: "Boring or confusing game/topic, or one requiring extensive player knowledge/prep that most attendees are unlikely to have",
    },
  },
  {
    field: "Rubric: Fun",
    label: "Fun",
    guidance: {
      Best: "Absolutely!!! I will schedule my break so I can attend this.",
      Good: "Yes! I’m bummed I’ll miss it, but I’ll live.",
      Meh: "Maybe? Or fun for some but not for most.",
      Bad: "No.",
    },
  },
] as const;

export const GRADING_STATUSES = [
  "Not started",
  "In Progress",
  "Done",
  "Blocked",
] as const;

const DROPIN_OPTIONS = [
  "Dropins welcome",
  "Need to attend the entire block",
  "Some players need to attend full block, but dropins can spectate",
  "Other",
] as const;

const SHEPHERD_OPTIONS = [
  "Positive: I would be a good Shepherd for this spekaer, and would be excited to do so",
  "Neutral: I'm willing and able to be their Shepherd if needed",
  "Negative: I would be the wrong fit for Shepherd for this speaker/session",
  "Other or N/A",
] as const;

const TOPIC_OPTIONS = [
  "Board games",
  "Card games",
  "TTRPGs",
  "LARPs",
  "Word puzzles (e.g. crosswords)",
  "Number puzzles (e.g. Sudoku)",
  "Puzzle hunts",
  "Escape Rooms",
  "Video games",
  "Physical games",
  "Party Game",
] as const;

const SPACE_OPTIONS = [
  "Rat Park (Outdoors, Max 300)",
  "The Gardens (Outdoors, Max 80)",
  "Central Courtyard (Outdoors, Max 200)",
  "Glass Hall (A, first floor side, Max 35)",
  "2A4 Thingspace i.e. secret attic room (A, second floor, Max 20)",
  "Bayes Ground (B, 1st floor, Max 40)",
  "2B1 New Caprica (B, 2nd floor, Max 30)",
  "Bayes Attic (B, 3rd floor, Max 35)",
  "Cantor's Diagonal (C, Max 60)",
  "Eigen Hall (E, 1st floor, Max 40)",
  "2E1 Gyroscope (E, 2nd floor, Max 30)",
  "Other",
] as const;

export const GRADING_STATUS_FIELD = "Grading Status";

/** The non-rubric fields the grading form writes, in the order they're shown. */
export const META_FIELDS = [
  {
    field: "Grader notes on quality",
    label: "Notes on quality",
    kind: "text",
    help: "How does this proposal compare to the bar?",
  },
  {
    field: "Expected crowd size",
    label: "Expected crowd size",
    kind: "number",
    help: "Assuming 300 attendees and reasonable scheduling choices.",
  },
  {
    field: "Allow dropins?",
    label: "Allow dropins?",
    kind: "select",
    options: DROPIN_OPTIONS,
  },
  {
    field: "Topic areas",
    label: "Topic areas",
    kind: "multiSelect",
    options: TOPIC_OPTIONS,
  },
  {
    field: "Lighthaven Space Options",
    label: "Lighthaven spaces that would fit",
    kind: "multiSelect",
    options: SPACE_OPTIONS,
  },
  {
    field: "Grader Notes for Scheduler",
    label: "Notes for the scheduler",
    kind: "text",
    help: "Anything the schedule/space coordinator should know — long lead times, odd requirements, hazards.",
  },
  {
    field: "Shepherd match potential",
    label: "Would you be a good Shepherd for this host?",
    kind: "select",
    options: SHEPHERD_OPTIONS,
    help: "The Shepherd confirms the session, helps plan it, procures materials, and finds them on campus.",
  },
  {
    field: "Megagame integration",
    label: "Megagame integration",
    kind: "text",
    help: "Worth flagging to the Megagame organizers as a potential fit?",
  },
] as const;

type Writable =
  | { kind: "select"; options: readonly string[] }
  | { kind: "multiSelect"; options: readonly string[] }
  | { kind: "text" }
  | { kind: "number" };

const WRITABLE: Record<string, Writable> = {
  [GRADING_STATUS_FIELD]: { kind: "select", options: GRADING_STATUSES },
  ...Object.fromEntries(
    RUBRIC_METRICS.map((m) => [
      m.field,
      { kind: "select", options: RUBRIC_GRADES } as Writable,
    ]),
  ),
  ...Object.fromEntries(
    META_FIELDS.map((f) => [
      f.field,
      ("options" in f
        ? { kind: f.kind, options: f.options }
        : { kind: f.kind }) as Writable,
    ]),
  ),
};

/** Fields shown to the grader as read-only context, in display order. */
export const CONTEXT_FIELDS = [
  { field: "Description", label: "Description" },
  { field: "Session Context", label: "Session context" },
  { field: "Category", label: "Category" },
  { field: "Duration", label: "Duration" },
  { field: "Minimum size", label: "Minimum size" },
  { field: "Maximum size", label: "Maximum size" },
  { field: "Age", label: "Age appropriateness" },
  { field: "Age elaboration", label: "Age notes" },
  { field: "Space needs", label: "Space needs" },
  { field: "Timing constraints", label: "Timing constraints" },
  { field: "Other Constraints", label: "Other constraints" },
  { field: "Application required?", label: "Application required?" },
  { field: "Bespoke needs?", label: "Bespoke needs?" },
  {
    field: "Interest level in tying this proposal to the Megagame?",
    label: "Interest in the Megagame",
  },
  { field: "Anything else?", label: "Anything else?" },
  { field: "Cohost(s)", label: "Cohost(s)" },
  { field: "Link (host)", label: "Host link" },
  { field: "Ricki's notes", label: "Ricki’s notes" },
] as const;

const GRADER_FIELD = "Rubric: Grader";
const PICTURE_FIELD = "Picture (host)";

export type Grader = { name: string; email: string };

export type Submission = {
  id: string;
  title: string;
  host: string;
  graders: Grader[];
  gradingStatus: string | null;
  /** True once any of the five rubric metrics has a value. */
  started: boolean;
  fields: Record<string, unknown>;
};

type AirtableRecord = { id: string; fields: Record<string, unknown> };

type Collaborator = { email?: string; name?: string };

function toSubmission(record: AirtableRecord): Submission {
  const { fields } = record;
  const raw = Array.isArray(fields[GRADER_FIELD])
    ? (fields[GRADER_FIELD] as Collaborator[])
    : [];
  return {
    id: record.id,
    title: typeof fields.Title === "string" ? fields.Title : "(untitled)",
    host: typeof fields.Host === "string" ? fields.Host : "",
    graders: raw.flatMap((c) =>
      c?.email ? [{ email: c.email, name: c.name || c.email }] : [],
    ),
    gradingStatus:
      typeof fields[GRADING_STATUS_FIELD] === "string"
        ? (fields[GRADING_STATUS_FIELD] as string)
        : null,
    started: RUBRIC_METRICS.some((m) => Boolean(fields[m.field])),
    fields,
  };
}

function tableUrl(recordId?: string) {
  const base = `https://api.airtable.com/v0/${airtableConfig.baseId}/${encodeURIComponent(airtableConfig.rfpSubmissionsTableId)}`;
  return recordId ? `${base}/${recordId}` : base;
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

/** Every proposal, newest first. ~30 rows today; pages in case the RFP lands more. */
export async function listSubmissions(): Promise<Submission[]> {
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
    .map(toSubmission)
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * The sign-in roster: everyone assigned at least one proposal. Derived from the
 * table rather than a committed list, so adding a grader is just assigning them
 * a row in Airtable.
 */
export function gradersFrom(submissions: Submission[]): Grader[] {
  const byEmail = new Map<string, Grader>();
  for (const submission of submissions) {
    for (const grader of submission.graders) {
      if (!byEmail.has(grader.email)) byEmail.set(grader.email, grader);
    }
  }
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSubmission(id: string): Promise<Submission | null> {
  // Record ids are always rec + 14 alphanumerics; anything else can't be a row.
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return null;
  try {
    return toSubmission((await airtable(tableUrl(id))) as AirtableRecord);
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

/** Host photo, if they uploaded one. */
export function hostPicture(
  submission: Submission,
): { url: string; width?: number; height?: number } | null {
  const attachments = submission.fields[PICTURE_FIELD];
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  const first = attachments[0] as {
    thumbnails?: { large?: { url: string; width?: number; height?: number } };
    url?: string;
  };
  const thumb = first.thumbnails?.large;
  if (thumb?.url) return thumb;
  return first.url ? { url: first.url } : null;
}

/**
 * Keep only known grading fields holding values the column actually accepts, so
 * a hand-rolled POST can't write to Verdict or invent a select option. An empty
 * string / empty array / null clears the cell.
 */
export function sanitizeGrades(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(input)) {
    const spec = WRITABLE[field];
    if (!spec) continue;

    if (spec.kind === "text") {
      if (typeof value === "string") out[field] = value.trim();
      continue;
    }
    if (spec.kind === "number") {
      if (value === "" || value === null) out[field] = null;
      else {
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) out[field] = Math.round(n);
      }
      continue;
    }
    if (spec.kind === "select") {
      if (value === "" || value === null) out[field] = null;
      else if (typeof value === "string" && spec.options.includes(value)) {
        out[field] = value;
      }
      continue;
    }
    if (Array.isArray(value)) {
      out[field] = value.filter(
        (v): v is string => typeof v === "string" && spec.options.includes(v),
      );
    }
  }
  return out;
}

/**
 * Write a grader's scores onto the submission row. Only the allow-listed
 * grading fields are sent and `typecast` is off, so nothing here can reshape
 * the table's select options.
 */
export async function saveGrades(
  recordId: string,
  grades: Record<string, unknown>,
): Promise<void> {
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
    throw new Error("Invalid record id");
  }
  if (Object.keys(grades).length === 0) return;

  await airtable(tableUrl(recordId), {
    method: "PATCH",
    body: JSON.stringify({ fields: grades, typecast: false }),
  });
}
