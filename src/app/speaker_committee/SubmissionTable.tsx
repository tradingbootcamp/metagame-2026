import Link from "next/link";
import InfoTip from "@/app/grade/InfoTip";
import InlineSelect from "@/app/grade/InlineSelect";
import {
  GRADER_FIELD,
  NEXT_STEPS_FIELD,
  SHEPHERD_FIELD,
  VERDICT_FIELD,
} from "@/lib/rfp-fields";
import type { Submission } from "@/lib/rfp-rubric";

// The /grade overview's grouped table, rendered from the server page and from
// the schedule tab's client component alike, so no server-only imports here.

export const PATH = "/speaker_committee";

/** What a row needs; the schedule tab ships these to the client without the rest of the record. */
export type Row = Pick<
  Submission,
  "id" | "title" | "host" | "grader" | "shepherd" | "verdict" | "nextSteps"
>;

export const SORTS = [
  "proposal",
  "host",
  "grader",
  "verdict",
  "next",
  "shepherd",
] as const;
export type SortKey = (typeof SORTS)[number];

export type SortState = {
  sort: SortKey;
  dir: "asc" | "desc";
  q: string;
  /** The rest of the URL state, kept when a header re-sorts. */
  base: Record<string, string>;
};

/** Pill options and colours per pipeline column, plus the Shepherd ⓘ text. */
export type TableMeta = {
  options: Record<string, string[]>;
  colors: Record<string, Record<string, string>>;
  shepherdInfo?: string;
};

function SortLink({
  column,
  label,
  state,
}: {
  column: SortKey;
  label: string;
  state: SortState;
}) {
  const active = state.sort === column;
  return (
    <Link
      href={{
        pathname: PATH,
        query: {
          ...state.base,
          ...(state.q && { q: state.q }),
          sort: column,
          // Clicking the active column flips direction; a new column starts ascending.
          dir: active && state.dir === "asc" ? "desc" : "asc",
        },
      }}
      className={`text-xs font-semibold tracking-wide uppercase transition-colors ${
        active ? "text-navy" : "text-ink/45 hover:text-navy"
      }`}
    >
      {label}
      <span className="ml-1 inline-block w-2">
        {active ? (state.dir === "asc" ? "↑" : "↓") : ""}
      </span>
    </Link>
  );
}

export function SubmissionGroup({
  title,
  rows,
  state,
  meta,
  lead,
  rowClass,
}: {
  title: string;
  rows: Row[];
  state: SortState;
  meta: TableMeta;
  /** A narrow cell before the title, e.g. the schedule tab's grip. */
  lead?: (row: Row) => React.ReactNode;
  rowClass?: (row: Row) => string;
}) {
  if (rows.length === 0) return null;

  const cols = lead
    ? "lg:grid-cols-[1.5rem_minmax(0,1fr)_6.5rem_6.5rem_6.5rem_6.5rem]"
    : "lg:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_6.5rem]";

  const pill = (
    row: Row,
    field: string,
    value: string | null,
    label: string,
  ) => (
    <span className="flex min-w-0 items-center gap-1.5">
      {/* Below lg the columns stack, so they need their own labels. */}
      <span className="shrink-0 text-xs text-ink/40 lg:hidden">{label}</span>
      <InlineSelect
        recordId={row.id}
        field={field}
        value={value}
        options={meta.options[field] ?? []}
        colors={meta.colors[field] ?? {}}
        allowAdd={field === SHEPHERD_FIELD}
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
          {lead && <span />}
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
          <span className="flex items-center whitespace-nowrap">
            <SortLink column="shepherd" label="Shepherd" state={state} />
            {meta.shepherdInfo && <InfoTip text={meta.shepherdInfo} />}
          </span>
        </div>

        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`grid gap-1.5 px-4 py-3 transition-colors hover:bg-cream lg:items-center lg:gap-4 ${cols} ${rowClass?.(row) ?? ""}`}
            >
              {lead && <span className="flex">{lead(row)}</span>}
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
              {pill(row, GRADER_FIELD, row.grader, "Grader")}
              {pill(row, VERDICT_FIELD, row.verdict, "Verdict")}
              {pill(row, NEXT_STEPS_FIELD, row.nextSteps, "Next steps")}
              {pill(row, SHEPHERD_FIELD, row.shepherd, "Shepherd")}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
