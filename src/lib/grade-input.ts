import type {
  potentialPanel,
  rubricGrade,
  sessionDropins,
  sessionVerdict,
  shepherdMatch,
  topicArea,
} from "@/db/schema";
import {
  DROPINS_LABELS,
  GRADER_VERDICT_LABELS,
  POTENTIAL_PANEL_LABELS,
  RUBRIC_GRADE_LABELS,
  SHEPHERD_MATCH_LABELS,
  TOPIC_AREA_LABELS,
} from "./rfp-labels";

// A grade as the grading form or the JSON API sends it: keys are the
// session_grades columns, values the enum values. Plain data with type-only
// schema imports, so a client form can share the names.

type Value<E extends { enumValues: readonly string[] }> =
  E["enumValues"][number];

export type RubricGrade = Value<typeof rubricGrade>;

export const RUBRIC_KEYS = [
  "operationalEase",
  "hostCompetence",
  "hostNameRecognition",
  "subjectMatter",
  "fun",
] as const;
export type RubricKey = (typeof RUBRIC_KEYS)[number];

/** Location ids of the rooms the grader suggests. */
export const SPACE_OPTIONS_FIELD = "spaceOptions";
/** True (or "1" from a form) moves a session still in grading to the committee. */
export const ADVANCE_FIELD = "advance";

/** One grader's grade, whole: saving replaces every field of their row. */
export type GradeValues = Record<RubricKey, RubricGrade | null> & {
  verdictRecommendation: Value<typeof sessionVerdict> | null;
  qualityNotes: string | null;
  schedulerNotes: string | null;
  shepherdMatch: Value<typeof shepherdMatch> | null;
  topicAreas: Value<typeof topicArea>[];
  potentialPanels: Value<typeof potentialPanel>[];
  megagameIntegration: string | null;
  expectedCrowdSize: number | null;
  allowDropins: Value<typeof sessionDropins> | null;
};

/** Free-text session columns, each mirrored to its Airtable column. */
export const SESSION_TEXT_KEYS = [
  "context",
  "timingConstraints",
  "otherConstraints",
  "ageElaboration",
  "applicationRequired",
  "bespokeNeeds",
  "anythingElse",
  "megagameNotes",
  "ticketState",
  "housingStatus",
  "communicationNotes",
  "rickiNotes",
  "requestedDuration",
  "cohosts",
] as const;
export type SessionTextKey = (typeof SESSION_TEXT_KEYS)[number];
/** Absent keys are left as stored. */
export type SessionText = Partial<Record<SessionTextKey, string | null>>;

/** The shepherd's notes, which the grading form edits alongside the grade. */
export const GRADE_FORM_SESSION_KEYS = [
  "communicationNotes",
  "housingStatus",
  "ticketState",
] as const satisfies readonly SessionTextKey[];

export type GradeInput = {
  grade: GradeValues;
  spaceLocationIds: string[];
  session: SessionText;
  advance: boolean;
};

export type Invalid = { ok: false; field: string; error: string };
export type Parsed<T> = { ok: true; value: T } | Invalid;

const invalid = (field: string, error: string): Invalid => ({
  ok: false,
  field,
  error,
});

export class InvalidField extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

/** Null/absent/blank → null; else trimmed text. */
export function optionalText(body: Record<string, unknown>, key: string) {
  const v = body[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== "string")
    throw new InvalidField(key, `${key} must be text.`);
  return v.trim() || null;
}

/** One enum value, or null when absent/blank. */
export function optionalEnum<V extends string>(
  body: Record<string, unknown>,
  key: string,
  values: readonly V[] | Record<V, string>,
): V | null {
  const v = body[key];
  if (v === null || v === undefined || v === "") return null;
  const allowed = Array.isArray(values)
    ? (values as readonly string[])
    : Object.keys(values);
  if (typeof v !== "string" || !allowed.includes(v)) {
    throw new InvalidField(
      key,
      `${key} must be one of: ${allowed.join(", ")}.`,
    );
  }
  return v as V;
}

function enumList<V extends string>(
  body: Record<string, unknown>,
  key: string,
  labels: Record<V, string>,
): V[] {
  const v = body[key];
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v)) throw new InvalidField(key, `${key} must be a list.`);
  return [
    ...new Set(v.map((item) => optionalEnum({ [key]: item }, key, labels))),
  ].filter((item): item is V => item !== null);
}

const MAX_CROWD = 10000;

function count(body: Record<string, unknown>, key: string): number | null {
  const v = body[key];
  if (v === null || v === undefined) return null;
  const text = typeof v === "string" ? v.trim() : null;
  if (text === "") return null;
  const n =
    typeof v === "number"
      ? v
      : text !== null && /^\d+$/.test(text)
        ? Number(text)
        : NaN;
  if (!Number.isInteger(n) || n < 0 || n > MAX_CROWD) {
    throw new InvalidField(
      key,
      `${key} must be a whole number from 0 to ${MAX_CROWD}.`,
    );
  }
  return n;
}

/** The keys of a grade body besides the session notes. */
export const GRADE_KEYS = [
  ...RUBRIC_KEYS,
  "verdictRecommendation",
  "qualityNotes",
  "schedulerNotes",
  "shepherdMatch",
  "topicAreas",
  "potentialPanels",
  "megagameIntegration",
  "expectedCrowdSize",
  "allowDropins",
] as const satisfies readonly (keyof GradeValues)[];

/** Who the grade is for, when an admin saves someone else's. */
export const GRADER_KEYS = ["graderUserId", "graderEmail"] as const;

const ALLOWED_KEYS = new Set<string>([
  ...GRADE_KEYS,
  ...GRADE_FORM_SESSION_KEYS,
  ...GRADER_KEYS,
  SPACE_OPTIONS_FIELD,
  ADVANCE_FIELD,
]);

/** Location ids from `["id"]` or `[{locationId}]`, as GET returns them. */
function spaceIds(
  body: Record<string, unknown>,
  locationIds: readonly string[],
) {
  const v = body[SPACE_OPTIONS_FIELD];
  if (v === null || v === undefined) return [];
  const ids = Array.isArray(v)
    ? v.map((item) =>
        typeof item === "string"
          ? item
          : item && typeof item === "object" && "locationId" in item
            ? (item as { locationId: unknown }).locationId
            : null,
      )
    : null;
  if (
    !ids ||
    ids.some((id) => typeof id !== "string" || !locationIds.includes(id))
  ) {
    throw new InvalidField(
      SPACE_OPTIONS_FIELD,
      `${SPACE_OPTIONS_FIELD} must be a list of space-option location ids.`,
    );
  }
  return [...new Set(ids as string[])];
}

/**
 * A whole grade, checked against the enums; anything left out is cleared,
 * since saving replaces the grader's row. Session notes are only touched when
 * present. Unknown keys are refused. `locationIds` are the rooms a grade may
 * suggest.
 */
export function parseGrade(
  body: Record<string, unknown>,
  locationIds: readonly string[],
): Parsed<GradeInput> {
  try {
    const unknown = Object.keys(body).find((k) => !ALLOWED_KEYS.has(k));
    if (unknown !== undefined) {
      throw new InvalidField(unknown, `Unknown field ${unknown}.`);
    }
    const rubric = Object.fromEntries(
      RUBRIC_KEYS.map((key) => [
        key,
        optionalEnum(body, key, RUBRIC_GRADE_LABELS),
      ]),
    ) as Record<RubricKey, RubricGrade | null>;

    const session: SessionText = {};
    for (const key of GRADE_FORM_SESSION_KEYS) {
      if (key in body) session[key] = optionalText(body, key);
    }

    const advance = body[ADVANCE_FIELD] ?? false;
    if (typeof advance !== "boolean") {
      throw new InvalidField(
        ADVANCE_FIELD,
        `${ADVANCE_FIELD} must be true or false.`,
      );
    }
    return {
      ok: true,
      value: {
        grade: {
          ...rubric,
          verdictRecommendation: optionalEnum(
            body,
            "verdictRecommendation",
            GRADER_VERDICT_LABELS,
          ),
          qualityNotes: optionalText(body, "qualityNotes"),
          schedulerNotes: optionalText(body, "schedulerNotes"),
          shepherdMatch: optionalEnum(
            body,
            "shepherdMatch",
            SHEPHERD_MATCH_LABELS,
          ),
          topicAreas: enumList(body, "topicAreas", TOPIC_AREA_LABELS),
          potentialPanels: enumList(
            body,
            "potentialPanels",
            POTENTIAL_PANEL_LABELS,
          ),
          megagameIntegration: optionalText(body, "megagameIntegration"),
          expectedCrowdSize: count(body, "expectedCrowdSize"),
          allowDropins: optionalEnum(body, "allowDropins", DROPINS_LABELS),
        },
        spaceLocationIds: spaceIds(body, locationIds),
        session,
        advance,
      },
    };
  } catch (err) {
    if (err instanceof InvalidField) return invalid(err.field, err.message);
    throw err;
  }
}

/**
 * A stored grade as a parseGrade body, so a partial edit can be laid over it
 * and saved whole.
 */
export function gradeBody(
  grade: GradeValues,
  spaceLocationIds: readonly string[],
): Record<string, unknown> {
  return {
    ...Object.fromEntries(GRADE_KEYS.map((key) => [key, grade[key]])),
    [SPACE_OPTIONS_FIELD]: [...spaceLocationIds],
  };
}

const LIST_FIELDS = new Set<string>([
  "topicAreas",
  "potentialPanels",
  SPACE_OPTIONS_FIELD,
]);

/**
 * The grading form's FormData in parseGrade's shape. Drops the keys React
 * adds for server actions; a ticked advance box posts "1".
 */
export function formToBody(formData: FormData): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key).map(String);
    // The last value wins, so a hidden default before a checkbox reads as ticked.
    body[key] = LIST_FIELDS.has(key) ? values.filter(Boolean) : values.at(-1);
  }
  if (ADVANCE_FIELD in body) body[ADVANCE_FIELD] = body[ADVANCE_FIELD] === "1";
  return body;
}

/** Session text columns from a PATCH body; only the keys present. */
export function parseSessionText(
  body: Record<string, unknown>,
): Parsed<SessionText> {
  try {
    const out: SessionText = {};
    for (const key of SESSION_TEXT_KEYS) {
      if (key in body) out[key] = optionalText(body, key);
    }
    return { ok: true, value: out };
  } catch (err) {
    if (err instanceof InvalidField) return invalid(err.field, err.message);
    throw err;
  }
}
