import Link from "next/link";
import { connection } from "next/server";
import { GraderPicker, PasswordForm } from "./SignInForms";
import { isConfigured, readSession } from "@/lib/grader-auth";
import type { Grader } from "@/lib/grader-auth";
import {
  gradersFrom,
  listSubmissions,
  RUBRIC_METRICS,
  type Submission,
} from "@/lib/rfp-rubric";

const VIEWS = [
  { key: "mine", label: "Assigned to me" },
  { key: "all", label: "Everything" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

const SORTS = ["proposal", "grader", "verdict", "status", "grading"] as const;
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

const STATUS_ORDER = [
  "Not yet processed",
  "Needs small tweaks",
  "NEED TO REACH OUT TO SPEAKER TO CONFIRM",
  "Needs confirm from speaker",
  "Ready to add to schedule",
  "On schedule",
  "Rejected",
  "N/A",
];

/** Blank or unrecognised values sort after everything known. */
const rank = (order: string[], value: string | null) => {
  const i = value ? order.indexOf(value) : -1;
  return i === -1 ? order.length : i;
};

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

const graderNames = (s: Submission) => s.graders.map((g) => g.name).join(", ");

function compare(a: Submission, b: Submission, sort: SortKey) {
  if (sort === "grader") {
    // "￿" keeps unassigned rows at the bottom of an ascending sort.
    return (
      (graderNames(a) || "￿").localeCompare(graderNames(b) || "￿") ||
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
  if (sort === "status") {
    return (
      rank(STATUS_ORDER, a.status) - rank(STATUS_ORDER, b.status) ||
      a.title.localeCompare(b.title)
    );
  }
  return a.title.localeCompare(b.title);
}

function GradingPill({ submission }: { submission: Submission }) {
  const status = submission.gradingStatus ?? "Not started";
  const tone =
    status === "Done"
      ? "bg-moss/15 text-moss"
      : status === "Blocked"
        ? "bg-salmon/20 text-meeple-dark"
        : status === "In Progress"
          ? "bg-tan/25 text-navy"
          : "bg-ink/8 text-ink/55";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      {status}
    </span>
  );
}

/** Verdict and Status carry long option names, so these read as plain text. */
function Cell({ value, tone }: { value: string | null; tone?: string }) {
  if (!value) return <span className="text-sm text-ink/30">—</span>;
  return (
    <span
      className={`block truncate text-sm ${tone ?? "text-ink/70"}`}
      title={value}
    >
      {value}
    </span>
  );
}

function verdictTone(verdict: string | null) {
  if (verdict === "Confirmed" || verdict === "Probably yes") return "text-moss";
  if (verdict === "Rejected" || verdict === "Probably no")
    return "text-meeple-dark";
  return undefined;
}

/**
 * Initials only, so the column stays narrow and the title gets the room. The
 * name shows on hover at lg+; below that the row stacks and it just fits inline.
 */
function GraderChip({ graders }: { graders: Grader[] }) {
  const assigned = graders.length > 0;
  const names = assigned ? graders.map((g) => g.name).join(", ") : "Unassigned";
  const initials = assigned
    ? graders[0].name
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
          assigned
            ? "bg-navy text-cream"
            : "border border-dashed border-ink/30 text-ink/35"
        }`}
      >
        {initials}
      </span>
      <span className="truncate text-xs text-ink/70 lg:hidden">{names}</span>
      {/* Beside the circle, not below it: the list has overflow-hidden for its
          rounded corners, which would clip anything leaving the row. */}
      <span className="pointer-events-none absolute top-1/2 left-7 z-20 hidden -translate-y-1/2 rounded-lg bg-navy px-2 py-1 text-xs whitespace-nowrap text-cream opacity-0 shadow-lg transition-opacity group-hover/grader:opacity-100 lg:block">
        {names}
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
}: {
  title: string;
  submissions: Submission[];
  state: SortState;
}) {
  if (submissions.length === 0) return null;

  // Grader only earns a column in "Everything" — in "mine" it's always you.
  // Everything past the title is sized to its content so the title keeps the rest.
  const cols =
    state.view === "all"
      ? "lg:grid-cols-[minmax(0,1fr)_3.25rem_8.5rem_6.5rem_6.5rem]"
      : "lg:grid-cols-[minmax(0,1fr)_8.5rem_6.5rem_6.5rem]";

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
          <SortLink column="status" label="Status" state={state} />
        </div>

        <ul className="divide-y divide-line">
          {submissions.map((submission) => {
            const scored = RUBRIC_METRICS.filter(
              (m) => submission.fields[m.field],
            ).length;
            return (
              <li key={submission.id}>
                <Link
                  href={`/grade/${submission.id}`}
                  className={`grid gap-1.5 px-4 py-3 transition-colors hover:bg-cream lg:items-center lg:gap-4 ${cols}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy">
                      {submission.title}
                    </span>
                    <span className="block truncate text-sm text-ink/55">
                      {submission.host}
                    </span>
                  </span>
                  {state.view === "all" && (
                    <span className="min-w-0">
                      <GraderChip graders={submission.graders} />
                    </span>
                  )}
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-xs text-ink/45 tabular-nums">
                      {scored}/{RUBRIC_METRICS.length}
                    </span>
                    <GradingPill submission={submission} />
                  </span>
                  <span className="min-w-0">
                    {/* Below lg the columns stack, so they need their own labels. */}
                    <span className="mr-1 text-xs text-ink/40 lg:hidden">
                      Verdict
                    </span>
                    <Cell
                      value={submission.verdict}
                      tone={verdictTone(submission.verdict)}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="mr-1 text-xs text-ink/40 lg:hidden">
                      Status
                    </span>
                    <Cell value={submission.status} />
                  </span>
                </Link>
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
    return <GraderPicker graders={gradersFrom(submissions)} />;
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

  const me = session.grader.email;
  const byView: Record<ViewKey, Submission[]> = {
    mine: submissions.filter((s) => s.graders.some((g) => g.email === me)),
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
          />
          <Group
            title="Graded"
            submissions={visible.filter((s) => s.gradingStatus === "Done")}
            state={state}
          />
        </div>
      )}
    </div>
  );
}
