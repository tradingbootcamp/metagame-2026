import Link from "next/link";
import { connection } from "next/server";
import { GraderPicker, PasswordForm } from "./SignInForms";
import { isConfigured, readSession } from "@/lib/grader-auth";
import { identityName } from "@/lib/grader-identity";
import InlineSelect from "./InlineSelect";
import {
  GRADER_FIELD,
  listSubmissions,
  NEXT_STEPS_FIELD,
  optionColors,
  resolveEditableFields,
  resolveGraderNames,
  DECISION_FIELDS,
  SHEPHERD_FIELD,
  VERDICT_FIELD,
  type Submission,
} from "@/lib/rfp-rubric";

const VIEWS = [
  { key: "mine", label: "Assigned to me" },
  { key: "all", label: "Everything" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

const SORTS = [
  "proposal",
  "host",
  "grader",
  "verdict",
  "next",
  "shepherd",
] as const;
type SortKey = (typeof SORTS)[number];

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

const NEXT_STEPS_ORDER = [
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

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

// The list is grouped by pipeline step, so the headings drop the numbering the
// option names carry. Anything not named here just loses its "N. " prefix.
const GROUP_LABELS: Record<string, string> = {
  "1. Grade": "To grade",
  "7. None! We're good :) ": "All set",
};

const groupLabel = (step: string | null) =>
  step === null
    ? "Not triaged yet"
    : (GROUP_LABELS[step] ?? step.replace(/^\d+\.\s*/, "").trim());

function compare(a: Submission, b: Submission, sort: SortKey) {
  if (sort === "host") {
    return a.host.localeCompare(b.host) || a.title.localeCompare(b.title);
  }
  if (sort === "grader" || sort === "shepherd") {
    const who = (s: Submission) => (sort === "grader" ? s.grader : s.shepherd);
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

type SortState = {
  sort: SortKey;
  dir: "asc" | "desc";
  view: ViewKey;
  q: string;
};

function SortLink({
  column,
  label,
  state,
  className = "",
}: {
  column: SortKey;
  label: string;
  state: SortState;
  className?: string;
}) {
  const active = state.sort === column;
  return (
    <Link
      href={{
        pathname: "/grade",
        query: {
          view: state.view,
          ...(state.q && { q: state.q }),
          sort: column,
          // Clicking the active column flips direction; a new column starts ascending.
          dir: active && state.dir === "asc" ? "desc" : "asc",
        },
      }}
      className={`text-xs font-semibold tracking-wide uppercase transition-colors ${
        active ? "text-navy" : "text-ink/45 hover:text-navy"
      } ${className}`}
    >
      {label}
      <span className="ml-1 inline-block w-2">
        {active ? (state.dir === "asc" ? "↑" : "↓") : ""}
      </span>
    </Link>
  );
}

function Group({
  title,
  submissions,
  state,
  colors,
  decisionOptions,
}: {
  title: string;
  submissions: Submission[];
  state: SortState;
  colors: Record<string, Record<string, string>>;
  decisionOptions: Record<string, string[]>;
}) {
  if (submissions.length === 0) return null;

  // Everything past the title is sized to its content so the title keeps the
  // rest. Grader earns a column in both views now: "Assigned to me" also holds
  // rows you only shepherd, so it isn't always you any more.
  const cols = "lg:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_6.5rem]";

  return (
    <section>
      <h2 className="font-bebas mb-2 text-lg tracking-wide text-navy">
        {title}{" "}
        <span className="text-ink/40 tabular-nums">{submissions.length}</span>
      </h2>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div
          className={`hidden gap-4 border-b border-line bg-cream/60 px-4 py-2 lg:grid ${cols}`}
        >
          {/* One cell, two sorts: the rows stack title over host, so the
              header offers each of them separately. */}
          <span className="flex items-center gap-1.5">
            <SortLink column="proposal" label="Proposal" state={state} />
            <span aria-hidden className="text-ink/25">
              |
            </span>
            <SortLink column="host" label="Host" state={state} />
          </span>
          <SortLink column="grader" label="Grader" state={state} />
          <SortLink column="verdict" label="Verdict" state={state} />
          <SortLink column="next" label="Next steps" state={state} />
          <SortLink column="shepherd" label="Shepherd" state={state} />
        </div>

        <ul className="divide-y divide-line">
          {submissions.map((submission) => {
            // Not a whole-row link any more: the row holds dropdowns now, and a
            // stray click navigating away mid-edit would be worse.
            return (
              <li
                key={submission.id}
                className={`grid gap-1.5 px-4 py-3 transition-colors hover:bg-cream lg:items-center lg:gap-4 ${cols}`}
              >
                <span className="min-w-0">
                  <Link
                    href={`/grade/${submission.id}`}
                    className="block truncate font-medium text-navy hover:text-meeple hover:underline"
                  >
                    {submission.title}
                  </Link>
                  <span className="block truncate text-sm text-ink/55">
                    {submission.host}
                  </span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* Below lg the columns stack, so they need their own labels. */}
                  <span className="shrink-0 text-xs text-ink/40 lg:hidden">
                    Grader
                  </span>
                  <InlineSelect
                    recordId={submission.id}
                    field={GRADER_FIELD}
                    value={submission.grader}
                    options={decisionOptions[GRADER_FIELD]}
                    colors={colors[GRADER_FIELD]}
                  />
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 text-xs text-ink/40 lg:hidden">
                    Verdict
                  </span>
                  <InlineSelect
                    recordId={submission.id}
                    field={VERDICT_FIELD}
                    value={submission.verdict}
                    options={decisionOptions[VERDICT_FIELD]}
                    colors={colors[VERDICT_FIELD]}
                  />
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 text-xs text-ink/40 lg:hidden">
                    Next steps
                  </span>
                  <InlineSelect
                    recordId={submission.id}
                    field={NEXT_STEPS_FIELD}
                    value={submission.nextSteps}
                    options={decisionOptions[NEXT_STEPS_FIELD]}
                    colors={colors[NEXT_STEPS_FIELD]}
                  />
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 text-xs text-ink/40 lg:hidden">
                    Shepherd
                  </span>
                  <InlineSelect
                    recordId={submission.id}
                    field={SHEPHERD_FIELD}
                    value={submission.shepherd}
                    options={decisionOptions[SHEPHERD_FIELD]}
                    colors={colors[SHEPHERD_FIELD]}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default async function GradePage(props: PageProps<"/grade">) {
  // Every branch here is per-request. Without this the unconfigured branch
  // returns before anything touches cookies(), and the build bakes the page in
  // as static — after which no grader ever gets past the password form.
  await connection();

  if (!isConfigured()) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        Grading isn’t configured on this deploy — set{" "}
        <code>GRADER_PASSWORD</code> and <code>GRADER_SESSION_SECRET</code>.
      </p>
    );
  }

  const session = await readSession();
  if (!session) return <PasswordForm />;

  const submissions = await listSubmissions();
  if (!session.identity) {
    return <GraderPicker graders={await resolveGraderNames(submissions)} />;
  }

  // Null for "Someone else": no name to match rows against, so there's nothing
  // for "Assigned to me" to hold and the tab is dropped rather than shown empty.
  const me = identityName(session.identity);
  const views = me === null ? VIEWS.filter((v) => v.key !== "mine") : VIEWS;

  const params = await props.searchParams;
  const view = (views.find((v) => v.key === first(params.view))?.key ??
    views[0].key) as ViewKey;
  const rawQuery = first(params.q);
  const query = rawQuery.trim().toLowerCase();
  const sort = (SORTS.find((s) => s === first(params.sort)) ??
    "proposal") as SortKey;
  const dir = first(params.dir) === "desc" ? "desc" : "asc";
  const state: SortState = { sort, dir, view, q: rawQuery };

  const decisionFields = await resolveEditableFields(DECISION_FIELDS);
  const decisionOptions = Object.fromEntries(
    decisionFields.map((f) => [f.field, [...f.options]]),
  );
  const colors = await optionColors([
    GRADER_FIELD,
    VERDICT_FIELD,
    NEXT_STEPS_FIELD,
    SHEPHERD_FIELD,
  ]);
  const byView: Record<ViewKey, Submission[]> = {
    // Shepherding a session counts as yours too, not just grading it.
    mine: submissions.filter((s) => s.grader === me || s.shepherd === me),
    all: submissions,
  };
  const visible = byView[view]
    .filter(
      (s) =>
        !query ||
        s.title.toLowerCase().includes(query) ||
        s.host.toLowerCase().includes(query),
    )
    .sort((a, b) => (dir === "asc" ? 1 : -1) * compare(a, b, sort));

  // One section per pipeline step, in pipeline order, untriaged rows first —
  // those are the newest submissions and the easiest to lose track of. Any
  // step Airtable has gained since NEXT_STEPS_ORDER was written gets a section
  // of its own at the end, rather than its rows vanishing from the page.
  const steps: (string | null)[] = [
    ...[null, ...NEXT_STEPS_ORDER].filter((step) =>
      visible.some((s) => s.nextSteps === step),
    ),
    ...new Set(
      visible
        .map((s) => s.nextSteps)
        .filter((step) => step !== null && !NEXT_STEPS_ORDER.includes(step)),
    ),
  ];

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2">
        {views.map((v) => (
          <Link
            key={v.key}
            href={{ pathname: "/grade", query: { view: v.key } }}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              v.key === view
                ? "bg-navy text-cream"
                : "bg-ink/6 text-ink/70 hover:bg-ink/12"
            }`}
          >
            {v.label}{" "}
            <span className="tabular-nums opacity-60">
              {byView[v.key].length}
            </span>
          </Link>
        ))}
      </nav>

      {/* Plain GET form: filtering needs no client JS. */}
      <form action="/grade" className="flex gap-2">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <input
          type="search"
          name="q"
          defaultValue={rawQuery}
          placeholder="Search title or host"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <button
          type="submit"
          className="rounded-lg border border-line px-4 text-sm hover:bg-ink/5"
        >
          Search
        </button>
      </form>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink/55">
          No proposals match.{query && " Try clearing the search."}
        </p>
      ) : (
        <div className="space-y-6">
          {steps.map((step) => (
            <Group
              key={step ?? "untriaged"}
              title={groupLabel(step)}
              submissions={visible.filter((s) => s.nextSteps === step)}
              state={state}
              colors={colors}
              decisionOptions={decisionOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
