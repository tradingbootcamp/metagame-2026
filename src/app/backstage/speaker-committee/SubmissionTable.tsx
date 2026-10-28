import Link from "next/link";
import { formatPacificDay, formatPacificTime } from "@/lib/schedule";
import InfoTip from "@/app/grade/InfoTip";
import InlineSelect from "@/app/grade/InlineSelect";
import AccountPicker, { type PickerField } from "@/app/grade/AccountPicker";
import {
  MEGAGAME_INTEGRATION_INFO,
  PIPELINE_COLORS,
  SHEPHERD_INFO,
  slotLinkable,
  type PipelineField,
  type Row,
} from "@/lib/rfp-pipeline";

// The /grade overview's grouped table, rendered from the server page and from
// the schedule tab's client component alike, so no server-only imports here.

export const PATH = "/backstage/speaker-committee";

export type { Row };

export const SORTS = [
  "proposal",
  "host",
  "grader",
  "verdict",
  "next",
  "shepherd",
  "megagame",
  "scheduled",
] as const;
export type SortKey = (typeof SORTS)[number];

export type SortState = {
  sort: SortKey;
  dir: "asc" | "desc";
  q: string;
  /** The rest of the URL state, kept when a header re-sorts. */
  base: Record<string, string>;
};

/** Pill options per pipeline column, and what the Scheduled column needs. */
export type TableMeta = {
  options: Record<PipelineField, readonly string[]>;
  /** Location id → name, for the room a placed session sits in. */
  rooms: Record<string, string>;
  /** Pre-launch the session pages 404, so the time reads as plain text. */
  linkSessions: boolean;
  /** Saving needs submissions.grade; the board itself only needs schedule.manage. */
  editable: boolean;
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

  // Speaker tier is edited on the proposal page, not here: the row had grown
  // too wide to read.
  const cols = lead
    ? "lg:grid-cols-[1.5rem_minmax(0,1fr)_repeat(5,6.5rem)_9rem]"
    : "lg:grid-cols-[minmax(0,1fr)_repeat(5,6.5rem)_9rem]";

  const cell = (label: string, control: React.ReactNode) => (
    <span className="flex min-w-0 items-center gap-1.5">
      {/* Below lg the columns stack, so they need their own labels. */}
      <span className="shrink-0 text-xs text-ink/40 lg:hidden">{label}</span>
      {control}
    </span>
  );
  const pill = (
    row: Row,
    field: PipelineField,
    value: string | null,
    label: string,
  ) =>
    cell(
      label,
      <InlineSelect
        sessionId={row.id}
        field={field}
        value={value}
        options={meta.options[field]}
        colors={PIPELINE_COLORS[field]}
        readOnly={!meta.editable}
      />,
    );
  const scheduled = (row: Row) => {
    if (!row.placed || !row.startsAt) {
      return cell(
        "Scheduled",
        <span className="text-sm text-ink/40">Not yet scheduled</span>,
      );
    }
    const when = `${formatPacificDay(row.startsAt)} ${formatPacificTime(row.startsAt)}`;
    const room = row.locationId ? meta.rooms[row.locationId] : null;
    const draft = row.status !== "published";
    const linked = slotLinkable(row, meta.linkSessions);
    return cell(
      "Scheduled",
      <span className="min-w-0 text-sm">
        {linked ? (
          <Link
            href={`/schedule/${row.slug}`}
            className="block truncate text-navy hover:text-meeple hover:underline"
          >
            {when}
          </Link>
        ) : (
          <span className="block truncate text-ink/70">{when}</span>
        )}
        <span className="block truncate text-xs text-ink/50">
          {draft && "Draft · "}
          {room ?? "No room"}
        </span>
      </span>,
    );
  };
  const picker = (row: Row, field: PickerField, label: string) => {
    const userId = field === "grader" ? row.graderId : row.shepherdId;
    const name = field === "grader" ? row.grader : row.shepherd;
    return cell(
      label,
      <AccountPicker
        sessionId={row.id}
        field={field}
        value={userId && name ? { userId, label: name } : null}
        readOnly={!meta.editable}
      />,
    );
  };

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
            <InfoTip text={SHEPHERD_INFO} />
          </span>
          <span className="flex items-center whitespace-nowrap">
            <SortLink column="megagame" label="Megagame" state={state} />
            <InfoTip text={MEGAGAME_INTEGRATION_INFO} />
          </span>
          <SortLink column="scheduled" label="Scheduled" state={state} />
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
                  {row.host || "—"}
                </span>
              </span>
              {picker(row, "grader", "Grader")}
              {pill(row, "verdict", row.verdict, "Verdict")}
              {pill(row, "nextSteps", row.nextSteps, "Next steps")}
              {picker(row, "shepherd", "Shepherd")}
              {pill(
                row,
                "megagameIntegration",
                row.megagameIntegration,
                "Megagame",
              )}
              {scheduled(row)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
