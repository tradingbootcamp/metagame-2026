import {
  MEGAGAME_INTEGRATION_ORDER,
  NEXT_STEPS_ORDER,
  rank,
  SPEAKER_TIER_ORDER,
  VERDICT_ORDER,
  type Row,
} from "@/lib/rfp-pipeline";
import type { SortKey } from "./SubmissionTable";

export { groupLabel, stepsOf } from "@/lib/rfp-pipeline";

/** Whose column "assigned to me" reads on a tab. */
type Role = "grader" | "shepherd" | "either";

// Each step is a phase, and for the two phases that span two steps, whether
// anyone is assigned yet — the same split as the "Next steps" column.
const graded = (r: Row) => r.graderIds.length > 0;
const shepherded = (r: Row) => r.shepherdId !== null;

export const TABS = [
  {
    key: "all",
    label: "All",
    blurb: "Every proposal, grouped by where it is in the pipeline.",
    in: () => true,
    role: "either",
  },
  {
    key: "unprocessed",
    label: "Unprocessed",
    blurb: "Nothing has been done yet.",
    in: (r) => r.phase === null,
    role: "either",
  },
  {
    key: "assign-grader",
    label: "Grader",
    blurb: "Choose who should grade this proposal.",
    in: (r) => r.phase === "grading" && !graded(r),
    role: "grader",
  },
  {
    key: "grade",
    label: "Grade",
    blurb: "Fill out the grading rubric.",
    in: (r) => r.phase === "grading" && graded(r),
    role: "grader",
  },
  {
    key: "decide",
    label: "Decide",
    blurb: "The committee settles on a verdict.",
    in: (r) => r.phase === "deciding",
    role: "grader",
  },
  {
    key: "email-verdict",
    label: "Notify",
    blurb: "Email the speaker with the verdict.",
    in: (r) => r.phase === "notifying",
    role: "either",
  },
  {
    key: "assign-shepherd",
    label: "Shepherd",
    blurb: "Pick who will shepherd this session.",
    in: (r) => r.phase === "shepherding" && !shepherded(r),
    role: "shepherd",
  },
  {
    key: "shepherd-meeting",
    label: "Meeting",
    blurb: "The shepherd meets with the session host to discuss it.",
    in: (r) => r.phase === "shepherding" && shepherded(r),
    role: "shepherd",
  },
  {
    key: "schedule",
    label: "Schedule",
    blurb: "Place the session on the grid, then move it along to Done.",
    // Placed or not: a slot can be picked from any step, and this one ends
    // when someone says it's done.
    in: (r) => r.phase === "scheduling",
    role: "shepherd",
  },
  {
    key: "done",
    label: "Done",
    blurb: "No action needed, on the schedule or not.",
    in: (r) => r.phase === "ready",
    role: "shepherd",
  },
] as const satisfies readonly {
  key: string;
  label: string;
  /** One line under the tabs saying what the step is. */
  blurb: string;
  in: (row: Row) => boolean;
  role: Role;
}[];

export type Tab = (typeof TABS)[number];
export type TabKey = Tab["key"];

export function isMine(row: Row, role: Role, me: string | null): boolean {
  if (me === null) return false;
  const grading = row.graderIds.includes(me);
  const shepherding = row.shepherdId === me;
  if (role === "grader") return grading;
  if (role === "shepherd") return shepherding;
  return grading || shepherding;
}

export const inTab = (row: Row, tab: Tab) => tab.in(row);

/** The tab's rows: all of them, or only the viewer's by the tab's role. */
export function tabRows(
  rows: Row[],
  tab: Tab,
  me: string | null,
  mineOnly: boolean,
): Row[] {
  return rows.filter(
    (r) => inTab(r, tab) && (!mineOnly || isMine(r, tab.role, me)),
  );
}

/** How many of each tab's rows are the viewer's, for the badges. */
export function myCounts(
  rows: Row[],
  me: string | null,
): Record<TabKey, number> {
  return Object.fromEntries(
    TABS.map((t) => [t.key, tabRows(rows, t, me, true).length]),
  ) as Record<TabKey, number>;
}

export function compare(a: Row, b: Row, sort: SortKey) {
  if (sort === "host") {
    return a.host.localeCompare(b.host) || a.title.localeCompare(b.title);
  }
  if (sort === "grader" || sort === "shepherd") {
    const who = (s: Row) => (sort === "grader" ? s.grader : s.shepherd);
    // "￿" keeps unassigned rows at the bottom of an ascending sort.
    return (
      (who(a) || "￿").localeCompare(who(b) || "￿") ||
      a.title.localeCompare(b.title)
    );
  }
  if (sort === "verdict") {
    return (
      rank(VERDICT_ORDER, a.verdict) - rank(VERDICT_ORDER, b.verdict) ||
      a.title.localeCompare(b.title)
    );
  }
  if (sort === "next") {
    return (
      rank(NEXT_STEPS_ORDER, a.nextSteps) -
        rank(NEXT_STEPS_ORDER, b.nextSteps) || a.title.localeCompare(b.title)
    );
  }
  if (sort === "tier") {
    return (
      rank(SPEAKER_TIER_ORDER, a.speakerTier) -
        rank(SPEAKER_TIER_ORDER, b.speakerTier) ||
      a.title.localeCompare(b.title)
    );
  }
  if (sort === "megagame") {
    return (
      rank(MEGAGAME_INTEGRATION_ORDER, a.megagameIntegration) -
        rank(MEGAGAME_INTEGRATION_ORDER, b.megagameIntegration) ||
      a.title.localeCompare(b.title)
    );
  }
  return a.title.localeCompare(b.title);
}
