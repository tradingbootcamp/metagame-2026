"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import RfpPanel from "@/app/admin/schedule/RfpPanel";
import ScheduleGrid, {
  GrabHandle,
  type DropFn,
} from "@/app/admin/schedule/ScheduleGrid";
import { smallButtonClass } from "@/app/admin/ui";
import {
  buildDays,
  DEFAULT_DRAFT_MINUTES,
  END_GAP_MINUTES,
  formatPacificDay,
  formatPacificTime,
  hostNames,
  isPlaced,
  movedTimes,
  type Category,
  type ScheduleLocation,
  type ScheduleSession,
} from "@/lib/schedule";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import {
  moveScheduled,
  scheduleProposal,
  unschedule,
  type Result,
} from "./actions";
import {
  SubmissionGroup,
  type Row,
  type SortState,
  type TableMeta,
} from "./SubmissionTable";

/** A proposal waiting for a slot, with what the grid needs to book it. */
export type QueueRow = Row & { minutes: number; category: Category | null };

/** Queue rows ride the grid as stand-in sessions under this id. */
const queueId = (sessionId: string) => `rfp:${sessionId}`;
/** The session behind a grid session or a queue stand-in. */
const sessionIdOf = (s: ScheduleSession) =>
  s.id.startsWith("rfp:") ? s.id.slice(4) : s.id;

function asSession(row: QueueRow): ScheduleSession {
  return {
    id: queueId(row.id),
    slug: "",
    title: row.title,
    description: null,
    category: row.category,
    startsAt: null,
    endsAt: null,
    locationId: null,
    maxCapacity: null,
    minCapacity: null,
    ages: null,
    needs: null,
    status: "draft",
    airtableRfpRecordId: null,
    hosts: row.host ? [{ userId: "", name: row.host, email: "" }] : [],
    shepherd: null,
  };
}

type Change =
  | {
      kind: "place";
      session: ScheduleSession;
      startsAt: string;
      endsAt: string;
      locationId: string | null;
    }
  | { kind: "unplace"; session: ScheduleSession };

type Board = { sessions: ScheduleSession[]; queue: QueueRow[] };

export default function ScheduleBoard({
  sessions: savedSessions,
  queue: savedQueue,
  locations,
  going,
  proposals,
  mutedIds,
  showInQueue,
  title,
  state,
  meta,
}: {
  sessions: ScheduleSession[];
  queue: QueueRow[];
  locations: ScheduleLocation[];
  going: Record<string, number>;
  /** Every proposal by session id, for the details of what's on the grid. */
  proposals: Record<string, Row>;
  /** Sessions shown greyed: someone else's, in "assigned to me". */
  mutedIds: string[];
  /** Session ids an unscheduled session would show under in this view. */
  showInQueue: string[];
  title: string;
  state: SortState;
  meta: TableMeta;
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Picked up by its grip; stays held across scrolling and day tabs until dropped.
  const [heldId, setHeldId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Drops show at once; a failed save snaps back when the transition ends.
  const [board, apply] = useOptimistic<Board, Change>(
    { sessions: savedSessions, queue: savedQueue },
    (b, change) => {
      const sessionId = sessionIdOf(change.session);
      if (change.kind === "place") {
        const { startsAt, endsAt, locationId } = change;
        const placed = { ...change.session, startsAt, endsAt, locationId };
        const known = b.sessions.some((s) => s.id === placed.id);
        return {
          sessions: known
            ? b.sessions.map((s) => (s.id === placed.id ? placed : s))
            : [...b.sessions, placed],
          queue: b.queue.filter((r) => r.id !== sessionId),
        };
      }
      const row = proposals[sessionId];
      const s = change.session;
      return {
        sessions: b.sessions.map((x) =>
          x.id === s.id ? { ...x, startsAt: null, endsAt: null } : x,
        ),
        queue:
          row && showInQueue.includes(row.id)
            ? [
                ...b.queue,
                {
                  ...row,
                  category: s.category,
                  minutes: isPlaced(s)
                    ? (Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 60_000
                    : DEFAULT_DRAFT_MINUTES - END_GAP_MINUTES,
                },
              ]
            : b.queue,
      };
    },
  );

  const queueSessions = useMemo(
    () => new Map(board.queue.map((r) => [queueId(r.id), asSession(r)])),
    [board.queue],
  );
  const days = useMemo(() => buildDays(board.sessions), [board.sessions]);
  const muted = useMemo(() => new Set(mutedIds), [mutedIds]);

  const carrying = heldId
    ? (queueSessions.get(heldId) ??
      board.sessions.find((s) => s.id === heldId && isPlaced(s)) ??
      null)
    : null;
  const carriedRow = heldId?.startsWith("rfp:")
    ? board.queue.find((r) => queueId(r.id) === heldId)
    : undefined;
  // Only proposals go back to the list; hand-made sessions stay in /admin/schedule.
  const canUnschedule =
    carrying !== null && !carriedRow && carrying.id in proposals;

  useEffect(() => {
    if (!heldId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHeldId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [heldId]);

  const run = (change: Change, action: () => Promise<Result>) =>
    startTransition(async () => {
      apply(change);
      setError((await action()).error ?? null);
    });

  const grab = (s: ScheduleSession) =>
    setHeldId((id) => (id === s.id ? null : s.id));

  const drop: DropFn = (start, locationId) => {
    if (!carrying) return;
    setHeldId(null);
    const times = carriedRow
      ? {
          startsAt: start,
          endsAt: new Date(start.getTime() + carriedRow.minutes * 60_000),
        }
      : movedTimes(carrying, start);
    const change: Change = {
      kind: "place",
      session: carrying,
      startsAt: times.startsAt.toISOString(),
      endsAt: times.endsAt.toISOString(),
      locationId,
    };
    run(change, () =>
      carriedRow
        ? scheduleProposal(carriedRow.id, start.toISOString(), locationId)
        : moveScheduled(carrying.id, start.toISOString(), locationId),
    );
  };

  const takeOff = (s: ScheduleSession) => {
    setHeldId(null);
    setOpenId(null);
    run({ kind: "unplace", session: s }, () => unschedule(s.id));
  };

  const open = openId ? board.sessions.find((s) => s.id === openId) : null;
  const openRow = open ? proposals[sessionIdOf(open)] : undefined;
  const roomName = (id: string | null) =>
    locations.find((l) => l.id === id)?.name ?? "No room";

  return (
    <div className="space-y-6">
      {carrying && (
        <div
          role="status"
          className="sticky top-16 z-40 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-navy/30 bg-navy px-3 py-2 text-sm text-white shadow-md"
        >
          <span>
            {carriedRow ? "Scheduling" : "Moving"}{" "}
            <span className="font-semibold">{carrying.title}</span>
            <span className="text-white/70">
              {" "}
              — drop it on a slot
              {canUnschedule && ", or on the list to take it off the schedule"}.
              Esc cancels.
            </span>
          </span>
          <button
            type="button"
            onClick={() => setHeldId(null)}
            className="rounded border border-white/40 px-2 py-0.5 text-xs font-semibold hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p className="text-sm text-meeple">{error}</p>}

      <div
        onDragOver={(e) => {
          if (canUnschedule) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (canUnschedule && carrying) takeOff(carrying);
        }}
        className={`rounded-xl transition-colors ${
          canUnschedule
            ? "outline-2 outline-offset-4 outline-navy/40 outline-dashed"
            : ""
        }`}
      >
        {canUnschedule && carrying && (
          <button
            type="button"
            onClick={() => takeOff(carrying)}
            className="mb-3 w-full rounded-lg border border-dashed border-navy/40 bg-navy/[0.04] px-4 py-3 text-sm text-navy hover:bg-navy/[0.08]"
          >
            Drop here to take <strong>{carrying.title}</strong> off the schedule
          </button>
        )}
        {board.queue.length === 0 ? (
          <p className="rounded-xl border border-line bg-white px-4 py-6 text-center text-sm text-ink/55">
            Nothing waiting to be scheduled.
          </p>
        ) : (
          <SubmissionGroup
            title={title}
            rows={board.queue}
            state={state}
            meta={meta}
            rowClass={(r) => (heldId === queueId(r.id) ? "bg-navy/[0.06]" : "")}
            lead={(r) => (
              <GrabHandle
                session={queueSessions.get(queueId(r.id))!}
                carrying={heldId === queueId(r.id)}
                onGrab={grab}
                className="h-7 w-6"
              />
            )}
          />
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-bebas text-lg tracking-wide text-navy">
          On the schedule
        </h2>
        <ScheduleGrid
          days={days}
          locations={locations}
          going={going}
          carrying={carrying}
          carryMinutes={carriedRow?.minutes}
          muted={(s) => muted.has(s.id)}
          onOpen={(s) => setOpenId(s.id)}
          onGrab={grab}
          onDrop={drop}
        />
      </section>

      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpenId(null)}>
          <DialogContent className="max-h-[92vh] max-w-[560px] overflow-y-auto border-line bg-white px-6 py-6 text-ink">
            <DialogTitle className="font-bebas pr-6 text-2xl tracking-wide text-navy">
              {open.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-ink/65">
              {isPlaced(open)
                ? `${formatPacificDay(open.startsAt)} ${formatPacificTime(open.startsAt)}–${formatPacificTime(open.endsAt)} · ${roomName(open.locationId)}`
                : "Not placed"}
              {open.hosts.length > 0 && ` · ${hostNames(open)}`}
              {open.status === "draft" && " · Draft"}
            </DialogDescription>

            {openRow && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {(
                  [
                    ["Host", openRow.host],
                    ["Grader", openRow.grader],
                    ["Verdict", openRow.verdict],
                    ["Shepherd", openRow.shepherd],
                    ["Next steps", openRow.nextSteps],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-ink/50">{label}</dt>
                    <dd className="text-ink/85">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
            <RfpPanel
              sessionId={sessionIdOf(open)}
              recordId={open.airtableRfpRecordId}
              shepherd={open.shepherd}
            />

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Link href="/admin/schedule" className={smallButtonClass}>
                Edit in /admin/schedule
              </Link>
              {openRow && isPlaced(open) && (
                <button
                  type="button"
                  onClick={() => takeOff(open)}
                  className="rounded-md bg-meeple px-3 py-1 text-sm font-semibold text-white hover:bg-meeple-dark"
                >
                  Remove from schedule
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
