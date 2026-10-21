import {
  NEXT_STEPS_ASSIGN_GRADER,
  NEXT_STEPS_ASSIGN_SHEPHERD,
  NEXT_STEPS_GRADE,
  NEXT_STEPS_SCHEDULE,
  NEXT_STEPS_SHEPHERD_MEETING,
} from "@/lib/rfp-fields";
import type { Row, SortKey } from "./SubmissionTable";

/** Whose column "assigned to me" reads on a tab. */
type Role = "grader" | "shepherd" | "either";

export const TABS = [
  { key: "all", label: "All", steps: null, role: "either" },
  { key: "unprocessed", label: "Unprocessed", steps: [null], role: "either" },
  {
    key: "assign-grader",
    label: "Assign grader",
    steps: [NEXT_STEPS_ASSIGN_GRADER],
    role: "grader",
  },
  { key: "grade", label: "Grade", steps: [NEXT_STEPS_GRADE], role: "grader" },
  {
    key: "assign-shepherd",
    label: "Assign shepherd",
    steps: [NEXT_STEPS_ASSIGN_SHEPHERD],
    role: "shepherd",
  },
  {
    key: "shepherd-meeting",
    label: "Shepherd meeting",
    steps: [NEXT_STEPS_SHEPHERD_MEETING],
    role: "shepherd",
  },
  {
    key: "schedule",
    label: "Schedule",
    // Placed sessions sit at "7. None!" but show on the grid, not in a list.
    steps: [NEXT_STEPS_SCHEDULE],
    role: "shepherd",
  },
] as const satisfies readonly {
  key: string;
  label: string;
  steps: readonly (string | null)[] | null;
  role: Role;
}[];

export type Tab = (typeof TABS)[number];
export type TabKey = Tab["key"];

export function isMine(row: Row, role: Role, me: string | null): boolean {
  if (me === null) return false;
  if (role === "grader") return row.grader === me;
  if (role === "shepherd") return row.shepherd === me;
  return row.grader === me || row.shepherd === me;
}

export const inTab = (row: Row, tab: Tab) =>
  tab.steps === null ||
  (tab.steps as readonly (string | null)[]).includes(row.nextSteps);

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

// Airtable's own select order, so sorting reads the way the column does there.
const VERDICT_ORDER = [
  "Confirmed",
  "Probably yes",
  "This is running a game, probably fine",
  "Needs modification but could be promising",
  "Sponsorship / product placement potential — send Night Market form",
  "Probably no",
  "Rejected",
  "N/A",
];

export const NEXT_STEPS_ORDER = [
  "0. Assign grader",
  "1. Grade",
  "2. Committee decision",
  "3. Email speaker with verdict",
  "4. Assign shepherd",
  "5. Shepherd meeting",
  "6. Add to schedule",
  "7. None! We're good :) ",
  "N/A",
];

/** Blank or unrecognised values sort after everything known. */
const rank = (order: string[], value: string | null) => {
  const i = value ? order.indexOf(value) : -1;
  return i === -1 ? order.length : i;
};

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

// Groups drop the numbering the option names carry. Anything not named here
// just loses its "N. " prefix.
const GROUP_LABELS: Record<string, string> = {
  "1. Grade": "To grade",
  "7. None! We're good :) ": "All set",
};

export const groupLabel = (step: string | null) =>
  step === null
    ? "Not triaged yet"
    : (GROUP_LABELS[step] ?? step.replace(/^\d+\.\s*/, "").trim());

/**
 * The steps present among the rows, in pipeline order with untriaged first,
 * then any step Airtable has gained since NEXT_STEPS_ORDER was written, so no
 * row vanishes from the page.
 */
export function stepsOf(rows: Row[]): (string | null)[] {
  return [
    ...[null, ...NEXT_STEPS_ORDER].filter((step) =>
      rows.some((s) => s.nextSteps === step),
    ),
    ...new Set(
      rows
        .map((s) => s.nextSteps)
        .filter((step) => step !== null && !NEXT_STEPS_ORDER.includes(step)),
    ),
  ];
}
