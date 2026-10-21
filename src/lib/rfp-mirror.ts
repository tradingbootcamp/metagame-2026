import { after } from "next/server";
import { env } from "@/env";
import { airtableConfig } from "./airtable-config";
import type { GradeValues, SessionText, SessionTextKey } from "./grade-input";
import type { MirrorState, SpeakerTier } from "./rfp-sessions";
import {
  committeeName,
  DROPINS_LABELS,
  GRADER_VERDICT_LABELS,
  nextStepsFor,
  POTENTIAL_PANEL_LABELS,
  RUBRIC_GRADE_LABELS,
  SHEPHERD_MATCH_LABELS,
  SPACE_OPTION_LOCATIONS,
  SPEAKER_TIER_LABELS,
  TOPIC_AREA_LABELS,
  VERDICT_LABELS,
} from "./rfp-labels";

// Postgres is the source of truth for grading; during the transition each
// write is copied onto the session's Airtable RFP row so the base stays usable.
// Best effort: a failed copy is logged and never undoes the database write.

export type Fields = Record<string, unknown>;

const label = <V extends string>(labels: Record<V, string>, v: V | null) =>
  v === null ? null : labels[v];

/** Local dev and previews would write the real base, so they skip unless asked. */
export const mirrorEnabled = () =>
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
  process.env.RFP_AIRTABLE_MIRROR === "1";

export const nextStepsField = (state: MirrorState): Fields => ({
  "Next steps": nextStepsFor(state.phase, {
    graded: state.graded,
    shepherded: state.shepherdEmail !== null,
  }),
});

export const verdictField = (state: MirrorState): Fields => ({
  Verdict: label(VERDICT_LABELS, state.verdict),
});

/**
 * A Grader or Shepherd select from an account. Null when the account isn't a
 * committee name Airtable knows, so the caller skips the write.
 */
export function committeeField(
  field: "Rubric: Grader" | "Shepherd",
  email: string | null,
): Fields | null {
  if (email === null) {
    return { [field]: field === "Rubric: Grader" ? "Unassigned" : null };
  }
  const name = committeeName(email);
  if (!name) {
    console.warn(`[rfp-mirror] ${email} has no ${field} option; skipping`);
    return null;
  }
  return { [field]: name };
}

const SPACE_LABEL_BY_LOCATION = Object.fromEntries(
  Object.entries(SPACE_OPTION_LOCATIONS).map(([l, name]) => [name, l]),
);

/** One grade as the row's grading columns; Airtable holds a single grade. */
export function gradeFields(
  grade: GradeValues,
  spaceLocationNames: string[],
): Fields {
  return {
    "Rubric: Operational Ease": label(
      RUBRIC_GRADE_LABELS,
      grade.operationalEase,
    ),
    "Rubric: Host Competence": label(RUBRIC_GRADE_LABELS, grade.hostCompetence),
    "Rubric: Host Name Recognition": label(
      RUBRIC_GRADE_LABELS,
      grade.hostNameRecognition,
    ),
    "Rubric: Subject Matter": label(RUBRIC_GRADE_LABELS, grade.subjectMatter),
    "Rubric: Fun": label(RUBRIC_GRADE_LABELS, grade.fun),
    "Grader Verdict recomendation": label(
      GRADER_VERDICT_LABELS,
      grade.verdictRecommendation,
    ),
    "Grader notes on quality": grade.qualityNotes ?? "",
    "Grader Notes for Scheduler": grade.schedulerNotes ?? "",
    "Shepherd match potential": label(
      SHEPHERD_MATCH_LABELS,
      grade.shepherdMatch,
    ),
    "Topic areas": grade.topicAreas.map((t) => TOPIC_AREA_LABELS[t]),
    "Potential Panels": grade.potentialPanels.map(
      (p) => POTENTIAL_PANEL_LABELS[p],
    ),
    "Lighthaven Space Options": spaceLocationNames.flatMap((name) =>
      SPACE_LABEL_BY_LOCATION[name] ? [SPACE_LABEL_BY_LOCATION[name]] : [],
    ),
    "Megagame integration": grade.megagameIntegration ?? "",
    "Expected crowd size": grade.expectedCrowdSize,
    "Allow dropins?": label(DROPINS_LABELS, grade.allowDropins),
  };
}

const TEXT_FIELDS: Record<SessionTextKey, string> = {
  context: "Session Context",
  timingConstraints: "Timing constraints",
  otherConstraints: "Other Constraints",
  ageElaboration: "Age elaboration",
  applicationRequired: "Application required?",
  bespokeNeeds: "Bespoke needs?",
  anythingElse: "Anything else?",
  megagameNotes: "megagame notes",
  ticketState: "Ticket state",
  housingStatus: "Housing status",
  communicationNotes: "Communication notes",
  rickiNotes: "Ricki's notes",
  requestedDuration: "Duration",
  cohosts: "Cohost(s)",
};

/** The session columns given, as their Airtable columns. */
export function sessionFields(
  text: SessionText,
  speakerTier?: SpeakerTier | null,
): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(text)) {
    out[TEXT_FIELDS[key as SessionTextKey]] = value ?? "";
  }
  if (speakerTier !== undefined) {
    out["Speaker tier"] = label(SPEAKER_TIER_LABELS, speakerTier);
  }
  return out;
}

async function patch(recordId: string, fields: Fields) {
  const { AIRTABLE_API_KEY } = env;
  if (!AIRTABLE_API_KEY) throw new Error("Airtable is not configured");
  const res = await fetch(
    `https://api.airtable.com/v0/${airtableConfig.baseId}/${airtableConfig.rfpSubmissionsTableId}/${recordId}`,
    {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      // typecast off: a label that isn't an option fails instead of minting one.
      body: JSON.stringify({ fields, typecast: false }),
    },
  );
  if (!res.ok) {
    throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
  }
}

/**
 * Copy fields onto the RFP row once the response is sent. Each group is its
 * own PATCH, so one rejected option (a grader Airtable doesn't list) doesn't
 * sink the rest.
 */
export function mirror(
  recordId: string | null,
  ...groups: (Fields | null)[]
): void {
  if (!recordId) return;
  const writes = groups.filter(
    (g): g is Fields => g !== null && Object.keys(g).length > 0,
  );
  if (writes.length === 0) return;
  if (!mirrorEnabled()) {
    console.info(
      `[rfp-mirror] off here; would write ${recordId}:`,
      JSON.stringify(writes),
    );
    return;
  }
  const task = async () => {
    for (const fields of writes) {
      try {
        await patch(recordId, fields);
      } catch (err) {
        console.error(`[rfp-mirror] ${recordId} failed:`, err);
      }
    }
  };
  try {
    after(task);
  } catch {
    // Outside a request (a script), so there's no response to wait for.
    void task();
  }
}
