// Parsing for the JSON API under /api/admin/sessions. The routes are thin
// wrappers over rfp-sessions.ts; auth, body reading and error responses are the
// schedule API's (schedule-api.ts).

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  InvalidField,
  optionalEnum,
  parseSessionText,
  SESSION_TEXT_KEYS,
  type Parsed,
  type SessionText,
} from "./grade-input";
import {
  committeeAccounts,
  getRfpSession,
  getRfpSessionByRecordId,
  getRfpSessionBySlug,
  isSessionId,
  PHASES,
  SPEAKER_TIERS,
  VERDICTS,
  type Phase,
  type RfpSession,
  type SpeakerTier,
  type Verdict,
} from "./rfp-sessions";

export type RfpSessionQuery = {
  phases?: (Phase | null)[];
  verdicts?: (Verdict | null)[];
  /** A user id or email, resolved by the route. */
  grader?: string;
  shepherd?: string;
};

const NONE = "none";

function enumParam<V extends string>(
  params: URLSearchParams,
  key: string,
  values: readonly V[],
): (V | null)[] | undefined {
  const raw = params.getAll(key).flatMap((v) => v.split(","));
  if (raw.length === 0) return undefined;
  return raw.map((v) => {
    const value = v.trim();
    if (value === NONE) return null;
    if (!(values as readonly string[]).includes(value)) {
      throw new InvalidField(
        key,
        `${key} must be ${NONE} or one of: ${values.join(", ")}.`,
      );
    }
    return value as V;
  });
}

/**
 * `?phase=grading,deciding&verdict=none&grader=<id or email>&shepherd=…`.
 * Repeated or comma-separated values match any; "none" matches unset.
 */
export function parseRfpSessionQuery(
  params: URLSearchParams,
): Parsed<RfpSessionQuery> {
  try {
    const grader = params.get("grader")?.trim() || undefined;
    const shepherd = params.get("shepherd")?.trim() || undefined;
    return {
      ok: true,
      value: {
        phases: enumParam(params, "phase", PHASES),
        verdicts: enumParam(params, "verdict", VERDICTS),
        ...(grader && { grader }),
        ...(shepherd && { shepherd }),
      },
    };
  } catch (err) {
    if (err instanceof InvalidField)
      return { ok: false, field: err.field, error: err.message };
    throw err;
  }
}

export type RfpSessionPatch = {
  phase?: Phase | null;
  verdict?: Verdict | null;
  speakerTier?: SpeakerTier | null;
  /** A user id or email, resolved by the route; null clears it. */
  shepherd?: string | null;
  text: SessionText;
};

const PATCH_KEYS = new Set<string>([
  "phase",
  "verdict",
  "speakerTier",
  "shepherdUserId",
  "shepherdEmail",
  ...SESSION_TEXT_KEYS,
]);

/**
 * An account named by an id key or an email key, at most one of them: the
 * trimmed value, null when explicitly cleared (if `nullable`), or undefined
 * when neither is sent. Blank is refused.
 */
function accountRef(
  body: Record<string, unknown>,
  idKey: string,
  emailKey: string,
  nullable: boolean,
): string | null | undefined {
  const keys = [idKey, emailKey].filter((k) => k in body);
  if (keys.length === 0) return undefined;
  if (keys.length > 1) {
    throw new InvalidField(idKey, `Send ${idKey} or ${emailKey}, not both.`);
  }
  const [key] = keys;
  const v = body[key];
  if (v === null && nullable) return null;
  if (typeof v !== "string" || !v.trim()) {
    throw new InvalidField(
      key,
      nullable
        ? `${key} must be text, or null to clear.`
        : `${key} must be text.`,
    );
  }
  return v.trim();
}

/** Only the keys present change; null clears one. Unknown keys are refused. */
export function parseRfpSessionPatch(
  body: Record<string, unknown>,
): Parsed<RfpSessionPatch> {
  try {
    if ("shepherd" in body) {
      throw new InvalidField(
        "shepherd",
        "Set the shepherd with shepherdEmail or shepherdUserId.",
      );
    }
    const unknown = Object.keys(body).find((k) => !PATCH_KEYS.has(k));
    if (unknown !== undefined) {
      throw new InvalidField(unknown, `Unknown field ${unknown}.`);
    }
    const patch: RfpSessionPatch = { text: {} };
    if ("phase" in body) patch.phase = optionalEnum(body, "phase", PHASES);
    if ("verdict" in body)
      patch.verdict = optionalEnum(body, "verdict", VERDICTS);
    if ("speakerTier" in body)
      patch.speakerTier = optionalEnum(body, "speakerTier", SPEAKER_TIERS);
    const shepherd = accountRef(body, "shepherdUserId", "shepherdEmail", true);
    if (shepherd !== undefined) patch.shepherd = shepherd;
    const text = parseSessionText(body);
    if (!text.ok) return text;
    patch.text = text.value;
    return { ok: true, value: patch };
  } catch (err) {
    if (err instanceof InvalidField)
      return { ok: false, field: err.field, error: err.message };
    throw err;
  }
}

/**
 * Which account a body names: `graderUserId` or `graderEmail` (not both),
 * else undefined.
 */
export function namedGrader(
  body: Record<string, unknown>,
): Parsed<string | undefined> {
  try {
    const ref = accountRef(body, "graderUserId", "graderEmail", false);
    return { ok: true, value: ref ?? undefined };
  } catch (err) {
    if (err instanceof InvalidField)
      return { ok: false, field: err.field, error: err.message };
    throw err;
  }
}

const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;

/**
 * A session by id or the Airtable record id it was imported from, falling
 * back to the slug (a slug can look like either).
 */
export async function findRfpSession(id: string): Promise<RfpSession | null> {
  const found = isSessionId(id)
    ? await getRfpSession(id)
    : RECORD_ID.test(id)
      ? await getRfpSessionByRecordId(id)
      : null;
  return found ?? getRfpSessionBySlug(id);
}

/** The user id for a user id or an email, if that account exists. */
export async function resolveAccount(ref: string): Promise<string | null> {
  const { user } = schema;
  const where = ref.includes("@")
    ? eq(sql`lower(${user.email})`, ref.toLowerCase())
    : eq(user.id, ref);
  const [row] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(where)
    .limit(1);
  return row?.id ?? null;
}

/** A committee member among `committee` by user id or email. */
export function committeeMember<A extends { userId: string; email: string }>(
  committee: readonly A[],
  ref: string,
): A | null {
  const lower = ref.toLowerCase();
  return (
    committee.find(
      (a) => a.userId === ref || a.email.toLowerCase() === lower,
    ) ?? null
  );
}

/** The committee account a grader ref names, or the 400 message. */
export async function resolveGrader(
  ref: string,
): Promise<{ userId: string } | { error: string }> {
  const member = committeeMember(await committeeAccounts(), ref);
  return member
    ? { userId: member.userId }
    : { error: `${ref} isn't on the committee.` };
}

/** Grades only belong on sessions in the pipeline. */
export const inPipeline = (s: Pick<RfpSession, "recordId" | "phase">) =>
  s.recordId !== null || s.phase !== null;

export const NOT_IN_PIPELINE = "Not in the RFP pipeline; set a phase first.";
