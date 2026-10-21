import type { sessions } from "@/db/schema";
import {
  DISCORD_STATUS_LABELS,
  fromLabel,
  MEGAGAME_INTEREST_LABELS,
  NEXT_STEPS_PHASE,
  SPEAKER_TIER_LABELS,
  VERDICT_LABELS,
} from "./rfp-labels";

// An Airtable RFP Submissions record as session columns. Must match the
// one-off import that made the first sessions, so old and new rows agree.
// The writes live in rfp-intake-store.ts.

export type RfpSessionValues = Pick<
  typeof sessions.$inferInsert,
  | "title"
  | "description"
  | "category"
  | "ages"
  | "minCapacity"
  | "maxCapacity"
  | "needs"
  | "phase"
  | "verdict"
  | "speakerTier"
  | "context"
  | "requestedDuration"
  | "cohosts"
  | "timingConstraints"
  | "otherConstraints"
  | "ageElaboration"
  | "applicationRequired"
  | "bespokeNeeds"
  | "anythingElse"
  | "megagameInterest"
  | "marketingConsent"
  | "discordStatus"
  | "megagameNotes"
  | "ticketState"
  | "housingStatus"
  | "communicationNotes"
  | "rickiNotes"
>;

export type RfpHost = {
  /** Lowercased, before HOST_ALIASES. */
  email: string | null;
  name: string;
  discord: string | null;
  website: string | null;
};

export type RfpIntake = {
  values: RfpSessionValues;
  host: RfpHost;
  /** Labels with no enum value; their columns are left null. */
  warnings: string[];
};

/**
 * Host emails that belong to another account. Candidates in preference order:
 * the first with an account wins, else the first. mustExist: never create one.
 */
export const HOST_ALIASES: Record<string, { to: string[]; mustExist?: true }> =
  {
    "ricki@trading.camp": { to: ["ricki@metagame.games"], mustExist: true },
    "casey@slaydiumgames.com": {
      to: ["casey@slaydiumgames.com", "caseyjonescaseyjones@gmail.com"],
    },
    "caseyjonescaseyjones@gmail.com": {
      to: ["casey@slaydiumgames.com", "caseyjonescaseyjones@gmail.com"],
    },
  };

const text = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : null;
const int = (v: unknown) => (typeof v === "number" ? Math.round(v) : null);
const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((o): o is string => typeof o === "string") : [];

function category(options: string[]): RfpSessionValues["category"] {
  if (!options.length) return null;
  if (options.includes("Workshop")) return "workshop";
  if (options.some((o) => ["Lecture / talk", "Panel", "Q&A"].includes(o)))
    return "talk";
  if (options.every((o) => o === "Other")) return "other";
  return "game";
}

const AGES: Record<string, NonNullable<RfpSessionValues["ages"]>> = {
  "Appropriate for all ages": "all",
  "Primarily for children": "kids",
  "Adults only (18+)": "adults",
};

/** Only a single real choice says anything; "Other" alone or a mix is left null. */
function ages(options: string[]): RfpSessionValues["ages"] {
  const real = options.filter((o) => o !== "Other");
  return real.length === 1 ? (AGES[real[0]] ?? null) : null;
}

/** Drops values the sessions check constraints would refuse. */
function capacities(f: Record<string, unknown>) {
  let max = int(f["Maximum size"]);
  let min = int(f["Minimum size"]);
  if (max !== null && max <= 0) max = null;
  if (min !== null && (min < 0 || (max !== null && min > max))) min = null;
  return { minCapacity: min, maxCapacity: max };
}

export function mapRfpRecord(f: Record<string, unknown>): RfpIntake {
  const warnings: string[] = [];
  const select = <V extends string>(
    labels: Record<V, string>,
    field: string,
  ): V | null => {
    const label = f[field];
    if (label == null) return null;
    const v = typeof label === "string" ? fromLabel(labels, label) : null;
    if (v === null) warnings.push(`${field}: unknown option "${label}"`);
    return v;
  };

  const nextSteps = f["Next steps"];
  let phase: RfpSessionValues["phase"] = "grading";
  if (nextSteps != null) {
    phase =
      typeof nextSteps === "string"
        ? (NEXT_STEPS_PHASE[nextSteps] ?? null)
        : null;
    if (phase === null)
      warnings.push(`Next steps: unknown option "${nextSteps}"`);
  }

  const values: RfpSessionValues = {
    title: text(f.Title) ?? "Untitled proposal",
    description: text(f.Description),
    category: category(strings(f.Category)),
    ages: ages(strings(f.Age)),
    ...capacities(f),
    needs: text(f["Space needs"]),
    phase,
    verdict: select(VERDICT_LABELS, "Verdict"),
    speakerTier: select(SPEAKER_TIER_LABELS, "Speaker tier"),
    context: text(f["Session Context"]),
    requestedDuration: text(f.Duration),
    cohosts: text(f["Cohost(s)"]),
    timingConstraints: text(f["Timing constraints"]),
    otherConstraints: text(f["Other Constraints"]),
    ageElaboration: text(f["Age elaboration"]),
    applicationRequired: text(f["Application required?"]),
    bespokeNeeds: text(f["Bespoke needs?"]),
    anythingElse: text(f["Anything else?"]),
    megagameInterest: select(
      MEGAGAME_INTEREST_LABELS,
      "Interest level in tying this proposal to the Megagame?",
    ),
    marketingConsent: f["Session marketing consent"] === true,
    discordStatus: select(DISCORD_STATUS_LABELS, "Discord?"),
    megagameNotes: text(f["megagame notes"]),
    ticketState: text(f["Ticket state"]),
    housingStatus: text(f["Housing status"]),
    communicationNotes: text(f["Communication notes"]),
    rickiNotes: text(f["Ricki's notes"]),
  };

  const host: RfpHost = {
    email: text(f["Email (host)"])?.toLowerCase() ?? null,
    name: text(f.Host) ?? "",
    discord: text(f["Discord (host)"])?.replace(/^@/, "") ?? null,
    website: text(f["Link (host)"]),
  };

  return { values, host, warnings };
}

/** Columns of `values` to write where `existing` has none; capacities stay ordered. */
export function fillOnly(
  existing: Partial<RfpSessionValues>,
  values: RfpSessionValues,
): Partial<RfpSessionValues> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === "title" || key === "minCapacity" || key === "maxCapacity")
      continue;
    if (value != null && existing[key as keyof typeof existing] == null)
      patch[key] = value;
  }
  const { minCapacity: min, maxCapacity: max } = existing;
  if (
    max == null &&
    values.maxCapacity != null &&
    (min == null || values.maxCapacity >= min)
  )
    patch.maxCapacity = values.maxCapacity;
  const bound = max ?? values.maxCapacity;
  if (
    min == null &&
    values.minCapacity != null &&
    (bound == null || values.minCapacity <= bound)
  )
    patch.minCapacity = values.minCapacity;
  return patch as Partial<RfpSessionValues>;
}
