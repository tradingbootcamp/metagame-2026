import Link from "next/link";
import { connection } from "next/server";
import { GraderPicker, PasswordForm } from "./SignInForms";
import { isConfigured, readSession } from "@/lib/grader-auth";
import {
  gradersFrom,
  listSubmissions,
  RUBRIC_METRICS,
  type Submission,
} from "@/lib/rfp-rubric";

const VIEWS = [
  { key: "todo", label: "To grade" },
  { key: "mine", label: "Assigned to me" },
  { key: "all", label: "Everything" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

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
    "todo") as ViewKey;
  const query = first(params.q).trim().toLowerCase();

  const me = session.grader.email;
  const mine = submissions.filter((s) => s.graders.some((g) => g.email === me));
  const byView: Record<ViewKey, Submission[]> = {
    todo: mine.filter((s) => s.gradingStatus !== "Done"),
    mine,
    all: submissions,
  };
  const visible = byView[view].filter(
    (s) =>
      !query ||
      s.title.toLowerCase().includes(query) ||
      s.host.toLowerCase().includes(query),
  );

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
        <input
          type="search"
          name="q"
          defaultValue={first(params.q)}
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
          {view === "todo" ? "Nothing left to grade. " : "No proposals match. "}
          {query && "Try clearing the search."}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {visible.map((submission) => {
            const scored = RUBRIC_METRICS.filter(
              (m) => submission.fields[m.field],
            ).length;
            return (
              <li key={submission.id}>
                <Link
                  href={`/grade/${submission.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-cream"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy">
                      {submission.title}
                    </span>
                    <span className="block truncate text-sm text-ink/55">
                      {submission.host}
                      {view === "all" &&
                        submission.graders.length > 0 &&
                        ` · ${submission.graders.map((g) => g.name).join(", ")}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
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
      )}
    </div>
  );
}
