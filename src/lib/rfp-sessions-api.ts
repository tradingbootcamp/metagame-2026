// Parsing for the JSON API under /api/admin/sessions. The routes are thin
// wrappers over rfp-sessions.ts; auth, body reading and error responses are the
// schedule API's (schedule-api.ts).

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  InvalidField,
  optionalEnum,
  parseSessionText,
  type Parsed,
  type SessionText,
} from "./grade-input";
import {
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

/** Only the keys present change; null clears one. */
export function parseRfpSessionPatch(
  body: Record<string, unknown>,
): Parsed<RfpSessionPatch> {
  try {
    const patch: RfpSessionPatch = { text: {} };
    if ("phase" in body) patch.phase = optionalEnum(body, "phase", PHASES);
    if ("verdict" in body)
      patch.verdict = optionalEnum(body, "verdict", VERDICTS);
    if ("speakerTier" in body)
      patch.speakerTier = optionalEnum(body, "speakerTier", SPEAKER_TIERS);
    for (const key of ["shepherdUserId", "shepherdEmail"] as const) {
      if (!(key in body)) continue;
      const v = body[key];
      if (v !== null && typeof v !== "string") {
        throw new InvalidField(key, `${key} must be text or null.`);
      }
      patch.shepherd = v?.trim() || null;
    }
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
 * Which account a body names: `graderUserId` or `graderEmail`, else
 * undefined. Errors when it isn't text.
 */
export function namedGrader(
  body: Record<string, unknown>,
): Parsed<string | undefined> {
  for (const key of ["graderUserId", "graderEmail"] as const) {
    if (!(key in body)) continue;
    const v = body[key];
    if (typeof v !== "string" || !v.trim()) {
      return { ok: false, field: key, error: `${key} must be text.` };
    }
    return { ok: true, value: v.trim() };
  }
  return { ok: true, value: undefined };
}

const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;

/** A session by id, slug, or the Airtable record id it was imported from. */
export function findRfpSession(id: string): Promise<RfpSession | null> {
  if (isSessionId(id)) return getRfpSession(id);
  if (RECORD_ID.test(id)) return getRfpSessionByRecordId(id);
  return getRfpSessionBySlug(id);
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
