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

function count(body: Record<string, unknown>, key: string): number | null {
  const v = body[key];
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n) || n < 0) {
    throw new InvalidField(key, `${key} must be a whole number, 0 or more.`);
  }
  return n;
}

/**
 * A whole grade, checked against the enums; anything left out is cleared,
 * since saving replaces the grader's row. Session notes are only touched when
 * present. `locationIds` are the rooms a grade may suggest.
 */
export function parseGrade(
  body: Record<string, unknown>,
  locationIds: readonly string[],
): Parsed<GradeInput> {
  try {
    const rubric = Object.fromEntries(
      RUBRIC_KEYS.map((key) => [
        key,
        optionalEnum(body, key, RUBRIC_GRADE_LABELS),
      ]),
    ) as Record<RubricKey, RubricGrade | null>;

    const spaces = body[SPACE_OPTIONS_FIELD] ?? [];
    if (
      !Array.isArray(spaces) ||
      spaces.some((id) => typeof id !== "string" || !locationIds.includes(id))
    ) {
      throw new InvalidField(
        SPACE_OPTIONS_FIELD,
        `${SPACE_OPTIONS_FIELD} must be a list of space-option location ids.`,
      );
    }

    const session: SessionText = {};
    for (const key of GRADE_FORM_SESSION_KEYS) {
      if (key in body) session[key] = optionalText(body, key);
    }

    const advance = body[ADVANCE_FIELD];
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
        spaceLocationIds: [...new Set(spaces as string[])],
        session,
        advance: advance === true || advance === "1",
      },
    };
  } catch (err) {
    if (err instanceof InvalidField) return invalid(err.field, err.message);
    throw err;
  }
}

const LIST_FIELDS = new Set<string>([
  "topicAreas",
  "potentialPanels",
  SPACE_OPTIONS_FIELD,
]);

/** The grading form's FormData in parseGrade's shape. */
export function formToBody(formData: FormData): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key).map(String);
    body[key] = LIST_FIELDS.has(key) ? values.filter(Boolean) : values[0];
  }
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
