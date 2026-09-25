import Link from "next/link";
import { connection } from "next/server";
import { GraderPicker, PasswordForm } from "./SignInForms";
import { isConfigured, readSession } from "@/lib/grader-auth";
import InlineSelect from "./InlineSelect";
import { swatch } from "@/lib/airtable-colors";
import {
  GRADING_STATUS_FIELD,
  listSubmissions,
  NEXT_STEPS_FIELD,
  optionColors,
  resolveEditableFields,
  resolveGraderNames,
  DECISION_FIELDS,
  RUBRIC_METRICS,
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
  "grader",
  "verdict",
  "next",
  "grading",
  "shepherd",
] as const;
type SortKey = (typeof SORTS)[number];

// Worst-to-best, so ascending puts what still needs attention first.
const GRADING_ORDER = ["Not started", "In Progress", "Blocked", "Done"];

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

function compare(a: Submission, b: Submission, sort: SortKey) {
  if (sort === "grader" || sort === "shepherd") {
    const who = (s: Submission) => (sort === "grader" ? s.grader : s.shepherd);
    // "￿" keeps unassigned rows at the bottom of an ascending sort.
    return (
      (who(a) || "￿").localeCompare(who(b) || "￿") ||
      a.title.localeCompare(b.title)
    );
  }
  if (sort === "grading") {
    return (
      rank(GRADING_ORDER, a.gradingStatus) -
        rank(GRADING_ORDER, b.gradingStatus) || a.title.localeCompare(b.title)
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

function GradingPill({
  submission,
  colors,
}: {
  submission: Submission;
  colors: Record<string, string>;
}) {
  const status = submission.gradingStatus ?? "Not started";
  const tone = swatch(colors[status]);
  // Without the schema scope there are no Airtable colours, so fall back to the
  // site palette rather than rendering every status identically.
  const fallback =
    status === "Done"
      ? "bg-moss/15 text-moss"
      : status === "Blocked"
        ? "bg-salmon/20 text-meeple-dark"
        : status === "In Progress"
          ? "bg-tan/25 text-navy"
          : "bg-ink/8 text-ink/55";

  return (
    <span
      style={tone ?? undefined}
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone ? "" : fallback}`}
    >
      {status}
    </span>
  );
}

/**
 * Initials only, so the column stays narrow and the title gets the room. The
 * name shows on hover at lg+; below that the row stacks and it just fits inline.
 */
function GraderChip({ grader }: { grader: string | null }) {
  const name = grader ?? "Unassigned";
  const initials = grader
    ? grader
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
    : "–";

  return (
    // Full width so the whole cell is the hover target, not just the 24px circle.
    <span className="group/grader relative inline-flex w-full items-center gap-1.5">
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
          grader
            ? "bg-navy text-cream"
            : "border border-dashed border-ink/30 text-ink/35"
        }`}
      >
        {initials}
      </span>
      <span className="truncate text-xs text-ink/70 lg:hidden">{name}</span>
      {/* Beside the circle, not below it: the list has overflow-hidden for its
          rounded corners, which would clip anything leaving the row. */}
      <span className="pointer-events-none absolute top-1/2 left-7 z-20 hidden -translate-y-1/2 rounded-lg bg-navy px-2 py-1 text-xs whitespace-nowrap text-cream opacity-0 shadow-lg transition-opacity group-hover/grader:opacity-100 lg:block">
        {name}
      </span>
    </span>
  );
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

  // Grader only earns a column in "Everything" — in "mine" it's always you.
  // Everything past the title is sized to its content so the title keeps the rest.
  const cols =
    state.view === "all"
      ? "lg:grid-cols-[minmax(0,1fr)_3.25rem_8.5rem_6.5rem_6.5rem_6.5rem]"
      : "lg:grid-cols-[minmax(0,1fr)_8.5rem_6.5rem_6.5rem_6.5rem]";

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
          <SortLink column="proposal" label="Proposal" state={state} />
          {state.view === "all" && (
            <SortLink column="grader" label="Grader" state={state} />
          )}
          <SortLink column="grading" label="Grading" state={state} />
          <SortLink column="verdict" label="Verdict" state={state} />
          <SortLink column="next" label="Next steps" state={state} />
          <SortLink column="shepherd" label="Shepherd" state={state} />
        </div>

        <ul className="divide-y divide-line">
          {submissions.map((submission) => {
            const scored = RUBRIC_METRICS.filter(
              (m) => submission.fields[m.field],
            ).length;
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
                {state.view === "all" && (
                  <span className="min-w-0">
                    <GraderChip grader={submission.grader} />
                  </span>
                )}
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-xs text-ink/45 tabular-nums">
                    {scored}/{RUBRIC_METRICS.length}
                  </span>
                  <GradingPill
                    submission={submission}
                    colors={colors[GRADING_STATUS_FIELD]}
                  />
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* Below lg the columns stack, so they need their own labels. */}
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
  if (!session.grader) {
    return <GraderPicker graders={await resolveGraderNames(submissions)} />;
  }

  const params = await props.searchParams;
  const view = (VIEWS.find((v) => v.key === first(params.view))?.key ??
    "mine") as ViewKey;
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
    VERDICT_FIELD,
    NEXT_STEPS_FIELD,
    SHEPHERD_FIELD,
    GRADING_STATUS_FIELD,
  ]);
  const me = session.grader.name;
  const byView: Record<ViewKey, Submission[]> = {
    mine: submissions.filter((s) => s.grader === me),
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

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
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
          <Group
            title="To grade"
            submissions={visible.filter((s) => s.gradingStatus !== "Done")}
            state={state}
            colors={colors}
            decisionOptions={decisionOptions}
          />
          <Group
            title="Graded"
            submissions={visible.filter((s) => s.gradingStatus === "Done")}
            state={state}
            colors={colors}
            decisionOptions={decisionOptions}
          />
        </div>
      )}
    </div>
  );
}
