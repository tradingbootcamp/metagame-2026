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

const SORTS = ["proposal", "grader", "status"] as const;
type SortKey = (typeof SORTS)[number];

// Worst-to-best, so ascending puts what still needs attention first.
const STATUS_ORDER = ["Not started", "In Progress", "Blocked", "Done"];

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
  if (sort === "status") {
    return (
      STATUS_ORDER.indexOf(a.gradingStatus ?? "Not started") -
        STATUS_ORDER.indexOf(b.gradingStatus ?? "Not started") ||
      a.title.localeCompare(b.title)
    );
  }
  return a.title.localeCompare(b.title);
}

function StatusPill({ submission }: { submission: Submission }) {
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
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}

/** Reads as a person, so it can't be mistaken for part of the host's name. */
function GraderChip({ graders }: { graders: Grader[] }) {
  if (graders.length === 0) {
    return (
      <span className="rounded-full border border-dashed border-ink/25 px-2.5 py-1 text-xs text-ink/40">
        Unassigned
      </span>
    );
  }

  const names = graders.map((g) => g.name).join(", ");
  const initials = graders[0].name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span
      title={`Grader: ${names}`}
      className="flex w-fit items-center gap-1.5 rounded-full bg-ink/6 py-1 pr-2.5 pl-1 text-xs text-ink/70"
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-navy text-[9px] font-semibold text-cream">
        {initials}
      </span>
      <span className="truncate">{names}</span>
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
  const cols =
    state.view === "all"
      ? "sm:grid-cols-[minmax(0,1fr)_11rem_8rem]"
      : "sm:grid-cols-[minmax(0,1fr)_8rem]";

  return (
    <section>
      <h2 className="font-bebas mb-2 text-lg tracking-wide text-navy">
        {title}{" "}
        <span className="text-ink/40 tabular-nums">{submissions.length}</span>
      </h2>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div
          className={`hidden gap-4 border-b border-line bg-cream/60 px-4 py-2 sm:grid ${cols}`}
        >
          <SortLink column="proposal" label="Proposal" state={state} />
          {state.view === "all" && (
            <SortLink column="grader" label="Grader" state={state} />
          )}
          <SortLink
            column="status"
            label="Status"
            state={state}
            className="text-right"
          />
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
                  className={`grid gap-1.5 px-4 py-3 transition-colors hover:bg-cream sm:items-center sm:gap-4 ${cols}`}
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
                  <span className="flex items-center gap-2 sm:justify-end">
                    <span className="text-xs text-ink/45 tabular-nums">
                      {scored}/{RUBRIC_METRICS.length}
                    </span>
                    <StatusPill submission={submission} />
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
