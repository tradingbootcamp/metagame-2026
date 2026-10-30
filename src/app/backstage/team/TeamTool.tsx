"use client";

import { useMemo, useState, useTransition } from "react";
import { DownloadIcon, PlusIcon, UploadIcon } from "lucide-react";
import { claimPerson, setTaskStatus, type Result } from "./actions";
import {
  BoardContext,
  DueChip,
  panelClass,
  useBoard,
  type BoardCtx,
  type Dialog,
} from "./board";
import Dialogs from "./dialogs";
import {
  NeedsPeople,
  PeopleTab,
  TasksTab,
  TeamsTab,
  type PeopleFilter,
  type TaskFilter,
} from "./lists";
import { selectClass, selectStyle, smallButtonClass } from "../ui";
import { dutiesOf, summarize, toBoardFile, type Board } from "@/lib/team";

type Tab = "fill" | "teams" | "people" | "tasks";

// /backstage/team: everyone on the team, volunteers included, what each of
// them is in charge of, and what still needs someone. The numbers up top
// jump to the list behind them.
export default function TeamTool({
  board,
  me,
  canManage,
  today,
}: {
  board: Board;
  me: string | null;
  canManage: boolean;
  today: string;
}) {
  const [tab, setTab] = useState<Tab>("fill");
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("open");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [flash, setFlash] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  const ctx = useMemo<BoardCtx>(() => {
    const people = new Map(board.people.map((p) => [p.id, p]));
    const areas = new Map(board.areas.map((a) => [a.id, a]));
    const roles = new Map(board.roles.map((r) => [r.id, r]));
    return {
      board,
      today,
      me,
      canManage,
      pending,
      person: (id) => (id ? people.get(id) : undefined),
      area: (id) => (id ? areas.get(id) : undefined),
      role: (id) => (id ? roles.get(id) : undefined),
      act: (work, done) =>
        startTransition(async () => {
          const result = await work();
          setFlash(result.error || result.message ? result : null);
          if (!result.error) done?.();
        }),
      open: setDialog,
    };
  }, [board, today, me, canManage, pending]);

  const s = summarize(board, today);
  const empty = board.people.length === 0 && board.roles.length === 0;
  const show = (t: Tab, f?: () => void) => {
    setTab(t);
    f?.();
  };
  const stats = [
    {
      value: s.rolesToFill,
      label:
        s.rolesToFill === 1
          ? "role still needs people"
          : "roles still need people",
      sub: `${s.seats} ${s.seats === 1 ? "seat" : "seats"} open · ${s.rolesFilled} filled`,
      alert: s.rolesToFill > 0,
      go: () => show("fill"),
    },
    {
      value: s.tasksWithoutOwner,
      label:
        s.tasksWithoutOwner === 1 ? "task has no owner" : "tasks have no owner",
      sub: `of ${s.openTasks} open`,
      alert: s.tasksWithoutOwner > 0,
      go: () => show("tasks", () => setTaskFilter("unowned")),
    },
    {
      value: s.overdue,
      label: "overdue",
      sub: "tasks and roles past their date",
      alert: s.overdue > 0,
      go: () => show("tasks", () => setTaskFilter("overdue")),
    },
    {
      value: s.people,
      label: s.people === 1 ? "person on the team" : "people on the team",
      sub: `${s.staff} staff · ${s.volunteers} volunteers`,
      alert: false,
      go: () => show("people", () => setPeopleFilter("all")),
    },
    {
      value: s.unplaced,
      label: "not placed yet",
      sub: "no role and no open task",
      alert: s.unplaced > 0,
      go: () => show("people", () => setPeopleFilter("unplaced")),
    },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "fill", label: `Still need people (${s.rolesToFill})` },
    { key: "teams", label: `Teams (${board.areas.length})` },
    { key: "people", label: `People (${s.people})` },
    { key: "tasks", label: `Tasks (${s.openTasks})` },
  ];

  const exportBoard = () => {
    const blob = new Blob([JSON.stringify(toBoardFile(board), null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `metagame-team-board-${today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <BoardContext value={ctx}>
      <div className="space-y-6">
        {flash && (
          <p
            role="status"
            className={`flex items-start gap-3 rounded-lg px-4 py-2.5 text-sm ${
              flash.error ? "bg-meeple/10 text-meeple" : "bg-moss/15 text-moss"
            }`}
          >
            <span className="flex-1">{flash.error ?? flash.message}</span>
            <button
              type="button"
              onClick={() => setFlash(null)}
              className="text-xs underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </p>
        )}

        {empty ? (
          <div className={`${panelClass} px-6 py-8 text-center`}>
            <h2 className="font-bebas text-2xl tracking-wide text-navy">
              The board is empty
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
              {canManage
                ? "Import the board file written from the All Hands doc, or start adding people and roles."
                : "Nobody has set up the team yet. Ask a lead to import the All Hands list."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {stats.map((st) => (
              <li key={st.label}>
                <button
                  type="button"
                  onClick={st.go}
                  className={`${panelClass} h-full w-full px-4 py-3 text-left transition-colors hover:border-navy`}
                >
                  <span
                    className={`font-bebas block text-4xl leading-none ${
                      st.alert ? "text-meeple" : "text-navy"
                    }`}
                  >
                    {st.value}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-navy">
                    {st.label}
                  </span>
                  <span className="block text-xs text-ink/55">{st.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <You />

        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "border-meeple text-navy"
                  : "border-transparent text-ink/55 hover:text-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
          {canManage && (
            <span className="ml-auto flex flex-wrap gap-2 pb-2">
              <button
                type="button"
                onClick={() => setDialog({ kind: "role", id: null })}
                className={`${smallButtonClass} inline-flex items-center gap-1`}
              >
                <PlusIcon className="size-3.5" aria-hidden />
                Role
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: "import" })}
                className={`${smallButtonClass} inline-flex items-center gap-1`}
              >
                <UploadIcon className="size-3.5" aria-hidden />
                Import
              </button>
              {!empty && (
                <button
                  type="button"
                  onClick={exportBoard}
                  className={`${smallButtonClass} inline-flex items-center gap-1`}
                >
                  <DownloadIcon className="size-3.5" aria-hidden />
                  Export
                </button>
              )}
            </span>
          )}
        </div>

        {tab === "fill" && <NeedsPeople />}
        {tab === "teams" && <TeamsTab />}
        {tab === "people" && (
          <PeopleTab filter={peopleFilter} setFilter={setPeopleFilter} />
        )}
        {tab === "tasks" && (
          <TasksTab filter={taskFilter} setFilter={setTaskFilter} />
        )}
      </div>
      <Dialogs dialog={dialog} onClose={() => setDialog(null)} />
    </BoardContext>
  );
}

/** What the signed-in person is in charge of, or a way to find themselves. */
function You() {
  const { board, me, act, pending, role } = useBoard();
  const [pick, setPick] = useState("");
  if (!me) {
    const unlinked = board.people.filter((p) => !p.userId);
    if (unlinked.length === 0) return null;
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pick) act(() => claimPerson(pick));
        }}
        className={`${panelClass} flex flex-wrap items-center gap-3 px-5 py-3 text-sm`}
      >
        <span className="text-ink/70">
          Are you on the board? Pick your name to see what you&apos;re in charge
          of.
        </span>
        <select
          aria-label="Your name"
          value={pick}
          onChange={(e) => setPick(e.currentTarget.value)}
          className={`${selectClass} py-1 text-sm`}
          style={selectStyle}
        >
          <option value="">Your name…</option>
          {unlinked.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!pick || pending}
          className={smallButtonClass}
        >
          That&apos;s me
        </button>
      </form>
    );
  }
  const d = dutiesOf(board, me);
  const unfilledLeads = d.leads.filter((r) => r.holders.length === 0);
  const nothing =
    !d.holds.length &&
    !unfilledLeads.length &&
    !d.tasks.length &&
    !d.offered.length;
  return (
    <section className={`${panelClass} px-5 py-4`}>
      <h2 className="font-bebas text-xl tracking-wide text-navy">
        You&apos;re in charge of
      </h2>
      {nothing ? (
        <p className="mt-1 text-sm text-ink/60">
          Nothing yet. Pick something from the roles that still need people.
        </p>
      ) : (
        <div className="mt-2 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          {(d.holds.length > 0 ||
            unfilledLeads.length > 0 ||
            d.offered.length > 0) && (
            <div>
              <p className="text-xs tracking-wide text-ink/50 uppercase">
                Roles
              </p>
              {d.holds.length === 0 && unfilledLeads.length === 0 && (
                <p className="mt-1 text-ink/55">None held yet.</p>
              )}
              <ul className="mt-1 space-y-0.5">
                {d.holds.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">{r.title}</span>
                    <DueChip dueOn={r.dueOn} due={r.due} />
                  </li>
                ))}
                {unfilledLeads.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-navy">{r.title}</span>
                    <span className="text-xs text-meeple">
                      you lead it, nobody holds it yet
                    </span>
                  </li>
                ))}
              </ul>
              {d.offered.length > 0 && (
                <p className="mt-1 text-xs text-ink/55">
                  Offered to take: {d.offered.map((r) => r.title).join(" · ")}
                </p>
              )}
            </div>
          )}
          {d.tasks.length > 0 && (
            <div>
              <p className="text-xs tracking-wide text-ink/50 uppercase">
                Open tasks
              </p>
              <ul className="mt-1 space-y-1">
                {d.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${t.title} done`}
                      disabled={pending}
                      onChange={() => act(() => setTaskStatus(t.id, "done"))}
                      className="mt-0.5 size-4 accent-moss"
                    />
                    <span className="flex-1">
                      {t.title}
                      {t.roleId && (
                        <span className="text-ink/50">
                          {" "}
                          · {role(t.roleId)?.title}
                        </span>
                      )}
                    </span>
                    <DueChip dueOn={t.dueOn} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
