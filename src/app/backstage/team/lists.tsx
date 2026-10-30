"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon, PlusIcon } from "lucide-react";
import {
  addVolunteerAccounts,
  offer,
  setStake,
  setTaskOwner,
  setTaskStatus,
} from "./actions";
import {
  chipClass,
  DueChip,
  panelClass,
  People,
  PersonLink,
  seatsLabel,
  StaffingChip,
  useBoard,
} from "./board";
import { fieldClass, selectClass, selectStyle, smallButtonClass } from "../ui";
import {
  byDue,
  dutiesOf,
  isOpenTask,
  isOverdue,
  needsPeople,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type Role,
  type Task,
  type TaskStatus,
} from "@/lib/team";

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${panelClass} px-5 py-8 text-center text-ink/60`}>
      {children}
    </p>
  );
}

function RoleTitle({ role }: { role: Role }) {
  const { open } = useBoard();
  return (
    <button
      type="button"
      onClick={() => open({ kind: "role", id: role.id })}
      className="text-left font-semibold text-navy underline-offset-2 hover:text-meeple hover:underline"
    >
      {role.title}
    </button>
  );
}

function AreaName({ id }: { id: string | null }) {
  const { area } = useBoard();
  const a = area(id);
  return a ? (
    <span className="rounded-full bg-sky/60 px-2 py-0.5 text-xs text-navy">
      {a.name}
    </span>
  ) : null;
}

// ── Still need people ──────────────────────────────────────────────────────

export function NeedsPeople() {
  const { board } = useBoard();
  const roles = board.roles.filter(needsPeople).sort(byDue((r) => r.title));
  if (roles.length === 0)
    return (
      <Empty>
        Every active role has someone. Add a role when one comes up.
      </Empty>
    );
  return (
    <ul className="space-y-3">
      {roles.map((r) => (
        <RoleCard key={r.id} role={r} />
      ))}
    </ul>
  );
}

function RoleCard({ role }: { role: Role }) {
  const { board, canManage, me, act, pending } = useBoard();
  const [more, setMore] = useState(false);
  const offered = me !== null && role.interested.includes(me);
  const holds = me !== null && role.holders.includes(me);
  const others = board.people.filter((p) => !role.holders.includes(p.id));
  return (
    <li className={`${panelClass} px-5 py-4`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <RoleTitle role={role} />
        <AreaName id={role.areaId} />
        <StaffingChip role={role} />
        <span className="text-xs text-ink/50">{seatsLabel(role)}</span>
        <span className="ml-auto">
          <DueChip dueOn={role.dueOn} due={role.due} />
        </span>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-ink/50">Lead</dt>
        <dd>
          {role.leadId ? (
            <PersonLink id={role.leadId} />
          ) : (
            <span className="text-ink/40 italic">No lead set</span>
          )}
        </dd>
        {role.holders.length > 0 && (
          <>
            <dt className="text-ink/50">Held by</dt>
            <dd>
              <People ids={role.holders} />
            </dd>
          </>
        )}
        <dt className="text-ink/50">Offered</dt>
        <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {role.interested.length === 0 && (
            <span className="text-ink/40 italic">Nobody yet</span>
          )}
          {role.interested.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <PersonLink id={id} />
              {canManage && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => setStake(role.id, id, "assigned"))}
                  className="inline-flex items-center gap-0.5 rounded-md bg-moss/15 px-1.5 py-0.5 text-xs font-semibold text-moss hover:bg-moss/25 disabled:opacity-60"
                >
                  <CheckIcon className="size-3" aria-hidden />
                  Assign
                </button>
              )}
            </span>
          ))}
        </dd>
      </dl>
      {(role.description || role.skills) && (
        <div className="mt-2 text-sm text-ink/70">
          <p className={more ? "whitespace-pre-line" : "line-clamp-2"}>
            {role.description}
            {role.skills && (
              <span className="block text-ink/55">
                <span className="font-semibold">Skills:</span> {role.skills}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            className="mt-0.5 text-xs text-ink/50 underline-offset-2 hover:text-navy hover:underline"
          >
            {more ? "Less" : "More"}
          </button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canManage && (
          <select
            aria-label={`Assign someone to ${role.title}`}
            value=""
            disabled={pending}
            onChange={(e) => {
              const id = e.currentTarget.value;
              if (id) act(() => setStake(role.id, id, "assigned"));
            }}
            className={`${selectClass} py-1 text-sm`}
            style={selectStyle}
          >
            <option value="">Assign someone…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {me && !holds && (
          <button
            type="button"
            disabled={pending}
            onClick={() => act(() => offer(role.id, !offered))}
            className={`${smallButtonClass} ${
              offered ? "border-moss text-moss" : ""
            }`}
          >
            {offered ? "You offered · take it back" : "I can take this"}
          </button>
        )}
      </div>
    </li>
  );
}

// ── Teams ──────────────────────────────────────────────────────────────────

export function TeamsTab() {
  const { board, canManage, open } = useBoard();
  const sections = [
    ...board.areas.map((a) => ({ id: a.id, name: a.name })),
    { id: null, name: "No team yet" },
  ];
  return (
    <div className="space-y-4">
      {canManage && (
        <button
          type="button"
          onClick={() => open({ kind: "area", id: null })}
          className={`${smallButtonClass} inline-flex items-center gap-1`}
        >
          <PlusIcon className="size-3.5" aria-hidden />
          Team
        </button>
      )}
      {sections.map((s) => (
        <TeamSection key={s.id ?? "none"} areaId={s.id} name={s.name} />
      ))}
    </div>
  );
}

function TeamSection({
  areaId,
  name,
}: {
  areaId: string | null;
  name: string;
}) {
  const { board, canManage, open } = useBoard();
  const roles = board.roles
    .filter((r) => r.areaId === areaId && r.status === "active")
    .sort(byDue((r) => r.title));
  const tasks = board.tasks
    .filter((t) => t.areaId === areaId && isOpenTask(t))
    .sort(byDue((t) => t.title));
  const people = board.people.filter((p) => p.areaId === areaId);
  if (!areaId && !roles.length && !tasks.length && !people.length) return null;
  const toFill = roles.filter(needsPeople).length;
  return (
    <section className={`${panelClass} overflow-hidden`}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line bg-cream/60 px-5 py-3">
        <h2 className="font-bebas text-2xl tracking-wide text-navy">{name}</h2>
        <span className="text-sm text-ink/60">
          {people.length} {people.length === 1 ? "person" : "people"} ·{" "}
          {roles.length} {roles.length === 1 ? "role" : "roles"}
          {toFill > 0 && (
            <span className="text-meeple"> · {toFill} to fill</span>
          )}{" "}
          · {tasks.length} open {tasks.length === 1 ? "task" : "tasks"}
        </span>
        {canManage && areaId && (
          <button
            type="button"
            onClick={() => open({ kind: "area", id: areaId })}
            className="ml-auto text-sm text-ink/50 underline-offset-2 hover:text-navy hover:underline"
          >
            Rename
          </button>
        )}
      </header>
      <div className="grid gap-x-8 gap-y-5 px-5 py-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <h3 className="mb-1.5 text-xs tracking-wide text-ink/50 uppercase">
            Roles
          </h3>
          {roles.length === 0 ? (
            <p className="text-sm text-ink/40 italic">None yet</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {roles.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                >
                  <RoleTitle role={r} />
                  <StaffingChip role={r} />
                  <span className="min-w-0 basis-full text-ink/70 sm:basis-auto">
                    <People ids={r.holders} empty="Nobody yet" />
                  </span>
                  <span className="ml-auto">
                    <DueChip dueOn={r.dueOn} due={r.due} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="mb-1.5 text-xs tracking-wide text-ink/50 uppercase">
              Open tasks
            </h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-ink/40 italic">None</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {tasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap gap-x-2">
                    <TaskTitle task={t} />
                    <span className="text-ink/50">
                      {t.ownerId ? (
                        <PersonLink id={t.ownerId} muted />
                      ) : (
                        <span className="text-meeple">no owner</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-1.5 text-xs tracking-wide text-ink/50 uppercase">
              People
            </h3>
            <p className="text-sm">
              <People
                ids={people.map((p) => p.id)}
                empty="Nobody's home team"
              />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── People ─────────────────────────────────────────────────────────────────

export type PeopleFilter = "all" | "staff" | "volunteer" | "unplaced";

export function PeopleTab({
  filter,
  setFilter,
}: {
  filter: PeopleFilter;
  setFilter: (f: PeopleFilter) => void;
}) {
  const { board, canManage, act, pending, area, open } = useBoard();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = board.people
    .map((p) => ({ p, d: dutiesOf(board, p.id) }))
    .filter(({ p, d }) => {
      if (filter === "staff" && p.kind !== "staff") return false;
      if (filter === "volunteer" && p.kind !== "volunteer") return false;
      if (filter === "unplaced" && (d.holds.length || d.tasks.length))
        return false;
      if (!q) return true;
      return [p.name, p.contact ?? "", area(p.areaId)?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  const accounts = board.volunteerAccounts;
  return (
    <div className="space-y-4">
      {canManage && accounts.length > 0 && (
        <div
          className={`${panelClass} flex flex-wrap items-center gap-3 px-5 py-3 text-sm`}
        >
          <span>
            <strong>{accounts.length}</strong>{" "}
            {accounts.length === 1 ? "account holds" : "accounts hold"} the
            Volunteer role but {accounts.length === 1 ? "isn't" : "aren't"} on
            the board:{" "}
            <span className="text-ink/60">
              {accounts.map((a) => a.name || a.email).join(", ")}
            </span>
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              act(() => addVolunteerAccounts(accounts.map((a) => a.id)))
            }
            className={smallButtonClass}
          >
            Add {accounts.length === 1 ? "them" : `all ${accounts.length}`}
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "Everyone"],
            ["staff", "Staff"],
            ["volunteer", "Volunteers"],
            ["unplaced", "Not placed yet"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={chipClass(filter === key)}
          >
            {label}
          </button>
        ))}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search names"
          aria-label="Search people"
          className={`${fieldClass} ml-auto w-full max-w-60 py-1.5 text-sm`}
        />
      </div>
      {rows.length === 0 ? (
        <Empty>Nobody here.</Empty>
      ) : (
        <div className={`${panelClass} overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-ink/50 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Team</th>
                <th className="px-4 py-2 font-medium">In charge of</th>
                <th className="px-4 py-2 font-medium">Offered</th>
                <th className="px-4 py-2 font-medium">Open tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ p, d }) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <PersonLink id={p.id} />
                      {p.account && (
                        <LinkIcon
                          className="size-3.5 text-ink/40"
                          aria-label="Has an account"
                        />
                      )}
                    </span>
                    <span className="block text-xs text-ink/50">
                      {p.kind === "staff" ? "Staff" : "Volunteer"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-ink/70">
                    {area(p.areaId)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <RoleList roles={d.holds} />
                    <UnfilledLeads roles={d.leads} />
                  </td>
                  <td className="px-4 py-2">
                    <RoleList roles={d.offered} />
                  </td>
                  <td className="px-4 py-2">
                    {d.tasks.length === 0 ? (
                      <span className="text-ink/40">—</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {d.tasks.map((t) => (
                          <li key={t.id}>
                            <TaskTitle task={t} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canManage && (
        <button
          type="button"
          onClick={() => open({ kind: "people" })}
          className={`${smallButtonClass} inline-flex items-center gap-1`}
        >
          <PlusIcon className="size-3.5" aria-hidden />
          People
        </button>
      )}
    </div>
  );
}

function RoleList({ roles }: { roles: Role[] }) {
  if (roles.length === 0) return <span className="text-ink/40">—</span>;
  return (
    <ul className="space-y-0.5">
      {roles.map((r) => (
        <li key={r.id}>
          <RoleTitle role={r} />
        </li>
      ))}
    </ul>
  );
}

/** The roles someone answers for as lead until somebody takes them. */
function UnfilledLeads({ roles }: { roles: Role[] }) {
  const unfilled = roles.filter((r) => r.holders.length === 0);
  if (unfilled.length === 0) return null;
  return (
    <p
      title={unfilled.map((r) => r.title).join("\n")}
      className="mt-1 cursor-help text-xs text-meeple"
    >
      Lead for {unfilled.length} unfilled{" "}
      {unfilled.length === 1 ? "role" : "roles"}
    </p>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export type TaskFilter = "open" | "unowned" | "overdue" | "mine" | "closed";

function TaskTitle({ task }: { task: Task }) {
  const { open } = useBoard();
  return (
    <button
      type="button"
      onClick={() => open({ kind: "task", id: task.id })}
      className={`text-left underline-offset-2 hover:text-meeple hover:underline ${
        isOpenTask(task) ? "text-ink" : "text-ink/50 line-through"
      }`}
    >
      {task.title}
    </button>
  );
}

export function TasksTab({
  filter,
  setFilter,
}: {
  filter: TaskFilter;
  setFilter: (f: TaskFilter) => void;
}) {
  const { board, canManage, me, today, act, pending, role, area, open } =
    useBoard();
  const tasks = board.tasks
    .filter((t) => {
      switch (filter) {
        case "open":
          return isOpenTask(t);
        case "unowned":
          return isOpenTask(t) && !t.ownerId;
        case "overdue":
          return isOpenTask(t) && isOverdue(t.dueOn, today);
        case "mine":
          return t.ownerId !== null && t.ownerId === me;
        case "closed":
          return !isOpenTask(t);
      }
    })
    .sort(byDue((t) => t.title));
  const filters: [TaskFilter, string][] = [
    ["open", "Open"],
    ["unowned", "No owner"],
    ["overdue", "Overdue"],
    ...(me ? ([["mine", "Mine"]] as [TaskFilter, string][]) : []),
    ["closed", "Done or dropped"],
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={chipClass(filter === key)}
          >
            {label}
          </button>
        ))}
        {canManage && (
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => open({ kind: "task", id: null })}
              className={`${smallButtonClass} inline-flex items-center gap-1`}
            >
              <PlusIcon className="size-3.5" aria-hidden />
              Task
            </button>
            <button
              type="button"
              onClick={() => open({ kind: "tasks" })}
              className={smallButtonClass}
            >
              Several at once
            </button>
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <Empty>
          {filter === "unowned"
            ? "Every open task has an owner."
            : filter === "overdue"
              ? "Nothing is overdue."
              : "No tasks here."}
        </Empty>
      ) : (
        <div className={`${panelClass} overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-ink/50 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Team · role</th>
                <th className="px-4 py-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tasks.map((t) => {
                const mine = me !== null && t.ownerId === me;
                return (
                  <tr key={t.id} className="align-top">
                    <td className="px-4 py-2">
                      {canManage || mine ? (
                        <select
                          aria-label={`Status of ${t.title}`}
                          value={t.status}
                          disabled={pending}
                          onChange={(e) =>
                            act(() =>
                              setTaskStatus(
                                t.id,
                                e.currentTarget.value as TaskStatus,
                              ),
                            )
                          }
                          className={`${selectClass} py-1 text-sm`}
                          style={selectStyle}
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {TASK_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-ink/70">
                          {TASK_STATUS_LABELS[t.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <TaskTitle task={t} />
                    </td>
                    <td className="px-4 py-2">
                      {canManage ? (
                        <select
                          aria-label={`Owner of ${t.title}`}
                          value={t.ownerId ?? ""}
                          disabled={pending}
                          onChange={(e) =>
                            act(() =>
                              setTaskOwner(t.id, e.currentTarget.value || null),
                            )
                          }
                          className={`${selectClass} py-1 text-sm ${
                            t.ownerId ? "" : "border-meeple text-meeple"
                          }`}
                          style={selectStyle}
                        >
                          <option value="">No owner</option>
                          {board.people.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : t.ownerId ? (
                        <PersonLink id={t.ownerId} />
                      ) : (
                        <span className="text-meeple">No owner</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-ink/70">
                      {[area(t.areaId)?.name, role(t.roleId)?.title]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <DueChip dueOn={t.dueOn} done={!isOpenTask(t)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
