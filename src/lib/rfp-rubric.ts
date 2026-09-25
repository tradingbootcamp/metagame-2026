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
  "Immersive experience",
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

// `description` is the column's Airtable description, shown behind the ⓘ next to
// each label. Kept verbatim so the tooltip says what the Airtable field says.

/** The non-rubric fields the grading form writes, in the order they're shown. */
export const META_FIELDS = [
  {
    field: "Grader notes on quality",
    label: "Notes on quality",
    kind: "text",
    description:
      "Leave us any notes you'd like on the quality of this proposal / how it compares to the bar.",
  },
  {
    field: "Expected crowd size",
    label: "Expected crowd size",
    kind: "number",
    description:
      "Assuming 300 conference attendees, and that we make reasonable scheduling choices.",
  },
  {
    field: "Allow dropins?",
    label: "Allow dropins?",
    kind: "select",
    options: DROPIN_OPTIONS,
    description:
      "Does this session accommodate people dropping in (e.g. a lecture), or does it require commitment / continued participation (e.g. a game with a set number of players)?",
  },
  {
    field: "Topic areas",
    label: "Topic areas",
    kind: "multiSelect",
    options: TOPIC_OPTIONS,
    description: "Does this hit on certain subject areas in particular?",
  },
  {
    field: "Lighthaven Space Options",
    label: "Lighthaven space options",
    kind: "multiSelect",
    options: SPACE_OPTIONS,
    description:
      "Select all the spaces that would be a good fit for this session.",
  },
  {
    field: "Grader Notes for Scheduler",
    label: "Notes for the scheduler",
    kind: "text",
    description:
      "A space for notes to the schedule/space coordinator about anything you might want to flag — e.g. “this one requires a 12 step application process that needs to start in September” or “they want to hide money in trees around campus”.",
  },
  {
    field: "Shepherd match potential",
    label: "Would you be a good Shepherd for this host?",
    kind: "select",
    options: SHEPHERD_OPTIONS,
    description:
      "Would you (the Grader) be a good fit to be this speaker’s Shepherd? The Shepherd is the committee member assigned to guide the speaker through everything they need to succeed: emailing them to confirm their session, meeting to help plan it, procuring materials, making sure it lands in the right space, finding them on campus.",
  },
  {
    field: "Megagame integration",
    label: "Megagame integration",
    kind: "text",
    description:
      "Is this session worth flagging to the Megagame organizers as a potential fit for integrating into the Megagame?",
  },
  {
    // Airtable spells it "recomendation"; matched exactly so the write lands.
    field: "Grader Verdict recomendation",
    label: "Your verdict recommendation",
    kind: "select",
    options: [
      "This would be great for Metagame!!!",
      "Nice to have",
      "Add to unconference schedule",
      "Bad for Metagame",
    ],
    description:
      "Your recommendation as the grader. The committee's own call lives in Verdict, below.",
  },
] as const;

export const VERDICT_FIELD = "Verdict";
export const NEXT_STEPS_FIELD = "Next steps";
export const SHEPHERD_FIELD = "Shepherd";

const VERDICT_OPTIONS = [
  "Confirmed",
  "Probably yes",
  "Needs modification but could be promising",
  "Probably no",
  "Rejected",
  "N/A",
  "Sponsorship / product placement potential — send Night Market form",
  "This is running a game, probably fine",
] as const;

/** Where a proposal waits while it's still with its grader. */
export const NEXT_STEPS_GRADE = "1. Grade";
/** Where a grader's save moves it once the rubric is done. */
export const NEXT_STEPS_DECIDE = "2. Committee decision";

// Numbered in Airtable, so this order is the pipeline order. The trailing space
// on "7. None!" is in the option name itself — don't trim it or the write fails.
const NEXT_STEPS_OPTIONS = [
  "1. Grade",
  "2. Committee decision",
  "3. Email speaker with verdict",
  "4. Assign shepherd",
  "5. Shepherd meeting",
  "6. Add to schedule",
  "7. None! We're good :) ",
  "N/A",
] as const;

/**
 * The call on the proposal, kept apart from the rubric: these are the shared
 * pipeline columns the whole committee reads, not one grader's scoring.
 */
export const DECISION_FIELDS = [
  {
    field: VERDICT_FIELD,
    label: "Verdict",
    kind: "select",
    options: VERDICT_OPTIONS,
    description: "What's our decision on this session?",
  },
  {
    field: NEXT_STEPS_FIELD,
    label: "Next steps",
    kind: "select",
    options: NEXT_STEPS_OPTIONS,
    description: "Where are we at in the processing pipeline?",
  },
  {
    field: SHEPHERD_FIELD,
    label: "Shepherd",
    kind: "select",
    // No committed list: the names live in Airtable's own choices, which is
    // also where they're maintained. Empty until some are added there.
    options: [],
    description:
      "Which committee member is guiding this speaker through confirming, planning, and running their session?",
  },
] as const;

type Writable =
  | { kind: "select"; options: readonly string[] }
  | { kind: "multiSelect"; options: readonly string[] }
  | { kind: "text" }
  | { kind: "number" };

/** Committed fallback, used when the schema can't be read (see fieldSchema). */
const WRITABLE_FALLBACK: Record<string, Writable> = {
  ...Object.fromEntries(
    RUBRIC_METRICS.map((m) => [
      m.field,
      { kind: "select", options: RUBRIC_GRADES } as Writable,
    ]),
  ),
  ...Object.fromEntries(
    [...META_FIELDS, ...DECISION_FIELDS].map((f) => [
      f.field,
      ("options" in f
        ? { kind: f.kind, options: f.options }
        : { kind: f.kind }) as Writable,
    ]),
  ),
};

/**
 * Fields shown to the grader as read-only context, in display order. The
 * description is what the host was asked on the RFP form, which is often the
 * only way to read their answer correctly.
 */
export const CONTEXT_FIELDS = [
  {
    field: "Title",
    label: "Title",
    description: "Official title for us to put on the schedule.",
  },
  { field: "Host", label: "Host", description: "Submitter name." },
  {
    field: "Description",
    label: "Description",
    description:
      "A brief blurb (2–3 sentences) about the session, to be used on the public-facing schedule.",
  },
  {
    field: "Session Context",
    label: "Session context",
    description:
      "What is your vision, how do you plan to run it, where are you at in the ideation process, etc?",
  },
  {
    field: "Category",
    label: "Category",
    description: "What kind of thing is this?",
  },
  { field: "Duration", label: "Duration", description: "e.g. “1 hour”." },
  {
    field: "Minimum size",
    label: "Minimum size",
    description:
      "Smallest number of attendees that would still allow the host to run this session.",
  },
  {
    field: "Maximum size",
    label: "Maximum size",
    description:
      "Largest number of attendees that would still allow the host to run this session.",
  },
  {
    field: "Age",
    label: "Age appropriateness",
    description: "What is the age appropriateness of this event?",
  },
  {
    field: "Age elaboration",
    label: "Age notes",
    description: "Additional age appropriateness information.",
  },
  {
    field: "Space needs",
    label: "Space needs",
    description:
      "e.g. “indoors, with a projector or large screen” or “a circular table that seats 7” or “the room must be able to get fully dark” or “there must be a secret trapdoor that can only be opened by speaking in Aramaic during a crescent moon”.",
  },
  {
    field: "Timing constraints",
    label: "Timing constraints",
    description:
      "e.g. “I can’t run this on Friday” or “it must be at nighttime but can happen any night”.",
  },
  {
    field: "Other Constraints",
    label: "Other constraints",
    description:
      "Ability constraints, content warnings, or other things we should be aware of that may limit who might want to attend.",
  },
  {
    field: "Application required?",
    label: "Application required?",
    description:
      "If the host wants to handpick attendees: a link to the application, or information about the process and timeline. Blank means no application.",
  },
  {
    field: "Bespoke needs?",
    label: "Bespoke needs?",
    description:
      "Anything not covered above, like “I want to integrate this into the Megagame somehow” or “this is actually just advertising for my product, which I will also be trying to sell to attendees during this session”.",
  },
  {
    field: "Interest level in tying this proposal to the Megagame?",
    label: "Interest in the Megagame",
  },
  {
    field: "Anything else?",
    label: "Anything else?",
    description: "Free space for hosts to provide more information.",
  },
  {
    field: "Cohost(s)",
    label: "Cohost(s)",
    description: "If they plan to run this with others, those people’s names.",
  },
  {
    field: "Link (host)",
    label: "Host link",
    description:
      "For the host’s profile on the Metagame website. Ideally a link to something games-related they do — not necessarily the thing they’re most known for.",
  },
] as const;

/**
 * Shown above the host's own answers, because these come from us, not from the
 * proposal. The Grader itself is handled separately — it's parsed onto
 * `Submission.grader`.
 */
export const INTERNAL_FIELDS = [
  {
    field: "Ricki's notes",
    label: "Ricki’s notes",
    description: "Miscellaneous notes from Ricki that might be relevant.",
  },
] as const;

const GRADER_FIELD = "Rubric: Grader";
const PICTURE_FIELD = "Picture (host)";

export type Submission = {
  id: string;
  title: string;
  host: string;
  /** Assignee. A single select, so one name or nobody. */
  grader: string | null;
  shepherd: string | null;
  verdict: string | null;
  nextSteps: string | null;
  /** True once any of the five rubric metrics has a value. */
  started: boolean;
  fields: Record<string, unknown>;
};

type AirtableRecord = { id: string; fields: Record<string, unknown> };

const text = (value: unknown) => (typeof value === "string" ? value : null);

function toSubmission(record: AirtableRecord): Submission {
  const { fields } = record;
  return {
    id: record.id,
    title: typeof fields.Title === "string" ? fields.Title : "(untitled)",
    host: typeof fields.Host === "string" ? fields.Host : "",
    grader: text(fields[GRADER_FIELD]),
    shepherd: text(fields[SHEPHERD_FIELD]),
    verdict: text(fields[VERDICT_FIELD]),
    nextSteps: text(fields[NEXT_STEPS_FIELD]),
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

// ── Live field schema ────────────────────────────────────────────────────────
// Select options and field descriptions are read from Airtable rather than only
// from the lists above, so adding a Topic area (or editing a description) in
// Airtable shows up here without a deploy. Needs `schema.bases:read` on the
// token; without it every call below quietly falls back to the committed lists,
// which means a brand-new option just won't be offered yet.

const SCHEMA_TTL_SECONDS = 300;

type FieldSchema = {
  options?: string[];
  /** Option name → Airtable colour token, e.g. "greenBright". */
  colors?: Record<string, string>;
  description?: string;
};

type MetaField = {
  name: string;
  description?: string;
  options?: { choices?: { name: string; color?: string }[] };
};

async function fieldSchema(): Promise<Record<string, FieldSchema>> {
  const { AIRTABLE_API_KEY } = env;
  if (!AIRTABLE_API_KEY) return {};

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${airtableConfig.baseId}/tables`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
        next: { revalidate: SCHEMA_TTL_SECONDS },
      },
    );
    if (!res.ok) {
      // 403 = the token lacks schema.bases:read. Not fatal; grading still works.
      console.warn(
        `[grade] schema read failed (${res.status}) — using fallback`,
      );
      return {};
    }
    const { tables } = (await res.json()) as {
      tables: { id: string; fields: MetaField[] }[];
    };
    const table = tables.find(
      (t) => t.id === airtableConfig.rfpSubmissionsTableId,
    );
    if (!table) return {};

    return Object.fromEntries(
      table.fields.map((f) => [
        f.name,
        {
          options: f.options?.choices?.map((c) => c.name),
          colors: Object.fromEntries(
            f.options?.choices
              ?.filter((c) => c.color)
              .map((c) => [c.name, c.color as string]) ?? [],
          ),
          description: f.description,
        },
      ]),
    );
  } catch (err) {
    console.warn("[grade] schema read failed — using fallback:", err);
    return {};
  }
}

export type ResolvedField = {
  field: string;
  label: string;
  kind: "select" | "multiSelect" | "text" | "number";
  options: readonly string[];
  description?: string;
};

/** Editable fields with live options + descriptions layered over the committed ones. */
export async function resolveEditableFields(
  fields: readonly {
    field: string;
    label: string;
    kind: ResolvedField["kind"];
    options?: readonly string[];
    description?: string;
  }[],
): Promise<ResolvedField[]> {
  const schema = await fieldSchema();
  return fields.map((f) => ({
    field: f.field,
    label: f.label,
    kind: f.kind,
    options: schema[f.field]?.options ?? f.options ?? [],
    description: schema[f.field]?.description || f.description,
  }));
}

/**
 * Option name → Airtable colour token for the given fields, so a select can be
 * shown here in the colours it already has in Airtable. Empty without the
 * schema scope, in which case callers fall back to plain text.
 */
export async function optionColors(
  fields: readonly string[],
): Promise<Record<string, Record<string, string>>> {
  const schema = await fieldSchema();
  return Object.fromEntries(
    fields.map((field) => [field, schema[field]?.colors ?? {}]),
  );
}

/**
 * The sign-in roster: the names the assignee column offers. Read from the
 * select's own choices, so a committee member with no Airtable account — and
 * no proposal assigned to them yet — can still pick themselves. Falls back to
 * the names actually on rows when the schema can't be read.
 */
export async function resolveGraderNames(
  submissions: Submission[],
): Promise<string[]> {
  const schema = await fieldSchema();
  const choices = schema[GRADER_FIELD]?.options;
  if (choices?.length) return [...choices];
  return [
    ...new Set(submissions.flatMap((s) => (s.grader ? [s.grader] : []))),
  ].sort((a, b) => a.localeCompare(b));
}

type DisplayField = { field: string; label: string; description?: string };

/** CONTEXT_FIELDS / INTERNAL_FIELDS with live descriptions layered over the committed ones. */
export async function resolveDisplayFields(
  fields: readonly { field: string; label: string; description?: string }[],
): Promise<DisplayField[]> {
  const schema = await fieldSchema();
  return fields.map((f) => ({
    field: f.field,
    label: f.label,
    description: schema[f.field]?.description || f.description,
  }));
}

async function writableFields(): Promise<Record<string, Writable>> {
  const schema = await fieldSchema();
  // When the schema is readable, drop anything Airtable no longer has. Otherwise
  // one renamed column 422s the whole PATCH and nobody can save at all.
  const live = Object.keys(schema).length > 0;

  return Object.fromEntries(
    Object.entries(WRITABLE_FALLBACK)
      .filter(([field]) => {
        if (live && !(field in schema)) {
          console.warn(
            `[grade] field "${field}" is gone from Airtable — skipping`,
          );
          return false;
        }
        return true;
      })
      .map(([field, spec]) => {
        const options = schema[field]?.options;
        // Rubric options stay on the committed list: each one is paired with its
        // guidance text, so a renamed choice should fail loudly, not silently.
        const isRubric = RUBRIC_METRICS.some((m) => m.field === field);
        return [
          field,
          options && "options" in spec && !isRubric
            ? { ...spec, options }
            : spec,
        ];
      }),
  );
}

/**
 * Keep only known grading fields holding values the column actually accepts, so
 * a hand-rolled POST can't write to Verdict or invent a select option. An empty
 * string / empty array / null clears the cell.
 */
export async function sanitizeGrades(
  input: unknown,
): Promise<Record<string, unknown>> {
  const WRITABLE = await writableFields();
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
