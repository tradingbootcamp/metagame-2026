import {
  NEXT_STEPS_ORDER,
  rank,
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
  { key: "all", label: "All", in: () => true, role: "either" },
  {
    key: "unprocessed",
    label: "Unprocessed",
    in: (r) => r.phase === null,
    role: "either",
  },
  {
    key: "assign-grader",
    label: "Assign grader",
    in: (r) => r.phase === "grading" && !graded(r),
    role: "grader",
  },
  {
    key: "grade",
    label: "Grade",
    in: (r) => r.phase === "grading" && graded(r),
    role: "grader",
  },
  {
    key: "assign-shepherd",
    label: "Assign shepherd",
    in: (r) => r.phase === "shepherding" && !shepherded(r),
    role: "shepherd",
  },
  {
    key: "shepherd-meeting",
    label: "Shepherd meeting",
    in: (r) => r.phase === "shepherding" && shepherded(r),
    role: "shepherd",
  },
  {
    key: "schedule",
    label: "Schedule",
    // Placed sessions are "ready" and show on the grid, not in a list.
    in: (r) => r.phase === "scheduling",
    role: "shepherd",
  },
] as const satisfies readonly {
  key: string;
  label: string;
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
  return a.title.localeCompare(b.title);
}
