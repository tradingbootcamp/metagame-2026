import Link from "next/link";
import { connection } from "next/server";
import SignIn from "./SignIn";
import { GraderPicker } from "./SignInForms";
import { gradeAccess, graderUserId } from "@/lib/grader-auth";
import InfoTip from "./InfoTip";
import InlineSelect from "./InlineSelect";
import {
  COMMITTEE_NAMES,
  groupLabel,
  NEXT_STEPS_ORDER,
  PIPELINE_COLORS,
  rank,
  SHEPHERD_INFO,
  stepsOf,
  toRow,
  VERDICT_ORDER,
  type PipelineField,
  type Row,
} from "@/lib/rfp-pipeline";
import { committeeAccounts, listRfpSessions } from "@/lib/rfp-sessions";

const VIEWS = [
  { key: "grading", label: "Grading assigned to me" },
  { key: "shepherding", label: "Shepherding assigned to me" },
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

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

function compare(a: Row, b: Row, sort: SortKey) {
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
  rows,
  state,
  options,
}: {
  title: string;
  rows: Row[];
  state: SortState;
  options: Record<PipelineField, readonly string[]>;
}) {
  if (rows.length === 0) return null;

  // Everything past the title is sized to its content so the title keeps the
  // rest.
  const cols = "lg:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_6.5rem]";

  const pill = (
    row: Row,
    field: PipelineField,
    value: string | null,
    label: string,
  ) => (
    <span className="flex min-w-0 items-center gap-1.5">
      {/* Below lg the columns stack, so they need their own labels. */}
      <span className="shrink-0 text-xs text-ink/40 lg:hidden">{label}</span>
      <InlineSelect
        sessionId={row.id}
        field={field}
        value={value}
        options={options[field]}
        colors={PIPELINE_COLORS[field]}
      />
    </span>
  );

  return (
    <section>
      <h2 className="font-bebas mb-2 text-lg tracking-wide text-navy">
        {title} <span className="text-ink/40 tabular-nums">{rows.length}</span>
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
          {/* Last column, so the ⓘ can spill into the row's right padding
              rather than forcing the header to wrap. */}
          <span className="flex items-center whitespace-nowrap">
            <SortLink column="shepherd" label="Shepherd" state={state} />
            <InfoTip text={SHEPHERD_INFO} />
          </span>
        </div>

        <ul className="divide-y divide-line">
          {rows.map((row) => (
            // Not a whole-row link: the row holds dropdowns, and a stray click
            // navigating away mid-edit would be worse.
            <li
              key={row.id}
              className={`grid gap-1.5 px-4 py-3 transition-colors hover:bg-cream lg:items-center lg:gap-4 ${cols}`}
            >
              <span className="min-w-0">
                <Link
                  href={`/grade/${row.id}`}
                  className="block truncate font-medium text-navy hover:text-meeple hover:underline"
                >
                  {row.title}
                </Link>
                <span className="block truncate text-sm text-ink/55">
                  {row.host}
                </span>
              </span>
              {pill(row, "grader", row.grader, "Grader")}
              {pill(row, "verdict", row.verdict, "Verdict")}
              {pill(row, "nextSteps", row.nextSteps, "Next steps")}
              {pill(row, "shepherd", row.shepherd, "Shepherd")}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default async function GradePage(props: PageProps<"/grade">) {
  // Every branch here is per-request. Without this the sign-in branch returns
  // before anything touches cookies(), and the build bakes the page in as
  // static — after which no grader ever gets past the sign-in form.
  await connection();

  const access = await gradeAccess();
  if (!access) return <SignIn />;
  if (!access.identity) return <GraderPicker graders={[...COMMITTEE_NAMES]} />;

  const [rfpSessions, committee, me] = await Promise.all([
    listRfpSessions(),
    committeeAccounts(),
    graderUserId(access),
  ]);
  const rows = rfpSessions.map(toRow);

  // Null for "Someone else" or a name without an account: nothing to match
  // rows against, so the "assigned to me" tabs are dropped rather than shown
  // empty.
  const views = me === null ? VIEWS.filter((v) => v.key === "all") : VIEWS;

  const params = await props.searchParams;
  // "Everything" is the landing view: the committee reads the whole pipeline
  // far more often than its own queue. "all" survives the anon filter below.
  const view = (views.find((v) => v.key === first(params.view))?.key ??
    "all") as ViewKey;
  const rawQuery = first(params.q);
  const query = rawQuery.trim().toLowerCase();
  const sort = (SORTS.find((s) => s === first(params.sort)) ??
    "proposal") as SortKey;
  const dir = first(params.dir) === "desc" ? "desc" : "asc";
  const state: SortState = { sort, dir, view, q: rawQuery };

  const names = committee.map((a) => a.committeeName);
  const options: Record<PipelineField, readonly string[]> = {
    grader: names,
    shepherd: names,
    verdict: VERDICT_ORDER,
    nextSteps: NEXT_STEPS_ORDER,
  };
  const byView: Record<ViewKey, Row[]> = {
    grading: rows.filter((s) => me !== null && s.graderIds.includes(me)),
    shepherding: rows.filter((s) => me !== null && s.shepherdId === me),
    all: rows,
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
        // One section per pipeline step, in pipeline order, untriaged rows
        // first — those are the newest submissions and the easiest to lose
        // track of.
        <div className="space-y-6">
          {stepsOf(visible).map((step) => (
            <Group
              key={step ?? "untriaged"}
              title={groupLabel(step)}
              rows={visible.filter((s) => s.nextSteps === step)}
              state={state}
              options={options}
            />
          ))}
        </div>
      )}
    </div>
  );
}
