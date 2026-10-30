"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import {
  addPeopleList,
  addTaskList,
  importBoard,
  linkPerson,
  removeArea,
  removePerson,
  removeRole,
  removeTask,
  saveArea,
  savePerson,
  saveRole,
  saveTask,
  setStake,
} from "./actions";
import { People, PersonLink, useBoard, type Dialog as Open } from "./board";
import { fieldClass, selectClass, selectStyle } from "../ui";
import {
  dutiesOf,
  ROLE_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type PersonKind,
  type RoleStatus,
  type TaskStatus,
} from "@/lib/team";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

const input = `${fieldClass} text-ink`;
const select = `${selectClass} w-full text-ink`;
const label = "block text-sm text-cream/80";

function Shell({
  title,
  description,
  onClose,
  wide,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`flex max-h-[90svh] flex-col gap-5 overflow-y-auto px-8 py-7 ${
          wide ? "max-w-[640px]" : "max-w-[480px]"
        }`}
      >
        <DialogTitle className="font-bebas text-2xl tracking-wide text-cream">
          {title}
        </DialogTitle>
        {description ? (
          <DialogDescription className="text-base text-cream/80">
            {description}
          </DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className={label}>
      <span className="mb-1 block">{name}</span>
      {children}
    </label>
  );
}

function Footer({
  onClose,
  onDelete,
  deleteLabel = "Delete",
  saveLabel = "Save",
}: {
  onClose: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  saveLabel?: string;
}) {
  const { pending } = useBoard();
  return (
    <div className="flex items-center gap-3">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="text-sm text-salmon underline-offset-2 hover:underline disabled:opacity-60"
        >
          {deleteLabel}
        </button>
      )}
      <span className="ml-auto flex gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : saveLabel}
        </Button>
      </span>
    </div>
  );
}

/** A select of every person on the board, with a blank first option. */
function PersonSelect({
  value,
  onChange,
  blank,
  exclude = [],
  ariaLabel,
}: {
  value: string;
  onChange: (id: string) => void;
  blank: string;
  exclude?: string[];
  ariaLabel?: string;
}) {
  const { board } = useBoard();
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      className={select}
      style={selectStyle}
    >
      <option value="">{blank}</option>
      {board.people
        .filter((p) => !exclude.includes(p.id))
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </select>
  );
}

function AreaSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { board } = useBoard();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      className={select}
      style={selectStyle}
    >
      <option value="">No team</option>
      {board.areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}

const ROLE_STATUS_LABELS: Record<RoleStatus, string> = {
  active: "Active",
  done: "Done",
  dropped: "Dropped",
};

// ── Role ───────────────────────────────────────────────────────────────────

function RoleDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { role, canManage, act, pending } = useBoard();
  const r = role(id);
  const [f, setF] = useState({
    title: r?.title ?? "",
    areaId: r?.areaId ?? "",
    leadId: r?.leadId ?? "",
    needed: String(r?.needed ?? 1),
    due: r?.due ?? "",
    dueOn: r?.dueOn ?? "",
    status: r?.status ?? ("active" as RoleStatus),
    description: r?.description ?? "",
    skills: r?.skills ?? "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((x) => ({ ...x, [k]: v }));

  if (!canManage && r) return <RoleDetails id={r.id} onClose={onClose} />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    act(
      () =>
        saveRole(id, {
          ...f,
          areaId: f.areaId || null,
          leadId: f.leadId || null,
          needed: Number(f.needed),
          due: f.due || null,
          dueOn: f.dueOn || null,
          description: f.description || null,
          skills: f.skills || null,
        }),
      onClose,
    );
  };
  return (
    <Shell
      title={r ? r.title : "New role"}
      description={
        r
          ? undefined
          : "A job someone has to hold. The lead answers for it until someone does."
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field name="Title">
          <input
            required
            autoFocus={!r}
            value={f.title}
            onChange={(e) => set("title")(e.currentTarget.value)}
            className={input}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="Team">
            <AreaSelect value={f.areaId} onChange={set("areaId")} />
          </Field>
          <Field name="Lead">
            <PersonSelect
              value={f.leadId}
              onChange={set("leadId")}
              blank="No lead"
            />
          </Field>
          <Field name="People it needs (0 for as many as want to)">
            <input
              type="number"
              min={0}
              max={500}
              value={f.needed}
              onChange={(e) => set("needed")(e.currentTarget.value)}
              className={input}
            />
          </Field>
          <Field name="Status">
            <select
              value={f.status}
              onChange={(e) => set("status")(e.currentTarget.value)}
              className={select}
              style={selectStyle}
            >
              {ROLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ROLE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field name="Next deadline">
            <input
              type="date"
              value={f.dueOn}
              onChange={(e) => set("dueOn")(e.currentTarget.value)}
              className={input}
            />
          </Field>
          <Field name="Due, as written">
            <input
              value={f.due}
              placeholder="Plan: Mon Nov 2 · Setup: Fri Nov 6"
              onChange={(e) => set("due")(e.currentTarget.value)}
              className={input}
            />
          </Field>
        </div>
        <Field name="What it involves">
          <textarea
            rows={4}
            value={f.description}
            onChange={(e) => set("description")(e.currentTarget.value)}
            className={input}
          />
        </Field>
        <Field name="Relevant skills">
          <input
            value={f.skills}
            onChange={(e) => set("skills")(e.currentTarget.value)}
            className={input}
          />
        </Field>
        {r && <RolePeople id={r.id} />}
        <Footer
          onClose={onClose}
          onDelete={
            r
              ? () => {
                  if (confirmDelete(`the role “${r.title}”`))
                    act(() => removeRole(r.id), onClose);
                }
              : undefined
          }
        />
        {pending && <span className="sr-only">Saving</span>}
      </form>
    </Shell>
  );
}

/** Who holds the role and who's offered, with assign and remove. */
function RolePeople({ id }: { id: string }) {
  const { role, act, pending } = useBoard();
  const r = role(id);
  if (!r) return null;
  const row = (pid: string, stake: "assigned" | "interested") => (
    <li key={pid} className="flex items-center gap-2 text-sm text-cream">
      <span className="min-w-0 flex-1 truncate">
        <PersonLink id={pid} />
      </span>
      {stake === "interested" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => act(() => setStake(r.id, pid, "assigned"))}
          className="rounded-md bg-moss px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Assign
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        aria-label="Take off this role"
        onClick={() => act(() => setStake(r.id, pid, null))}
        className="rounded-md p-1 text-cream/60 hover:bg-white/10 hover:text-cream disabled:opacity-60"
      >
        <XIcon className="size-3.5" aria-hidden />
      </button>
    </li>
  );
  return (
    <div className="grid gap-4 rounded-lg bg-white/5 p-4 sm:grid-cols-2 [&_a]:text-cream [&_button.text-navy]:text-cream">
      <div>
        <p className="mb-2 text-sm text-cream/80">Holds it</p>
        <ul className="space-y-1.5">
          {r.holders.map((pid) => row(pid, "assigned"))}
          {r.holders.length === 0 && (
            <li className="text-sm text-cream/50 italic">Nobody yet</li>
          )}
        </ul>
        <div className="mt-2">
          <PersonSelect
            ariaLabel="Assign someone"
            value=""
            blank="Assign someone…"
            exclude={r.holders}
            onChange={(pid) =>
              pid && act(() => setStake(r.id, pid, "assigned"))
            }
          />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm text-cream/80">Offered to</p>
        <ul className="space-y-1.5">
          {r.interested.map((pid) => row(pid, "interested"))}
          {r.interested.length === 0 && (
            <li className="text-sm text-cream/50 italic">Nobody yet</li>
          )}
        </ul>
        <div className="mt-2">
          <PersonSelect
            ariaLabel="Add someone interested"
            value=""
            blank="Add someone interested…"
            exclude={[...r.holders, ...r.interested]}
            onChange={(pid) =>
              pid && act(() => setStake(r.id, pid, "interested"))
            }
          />
        </div>
      </div>
    </div>
  );
}

function RoleDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const { role, area } = useBoard();
  const r = role(id)!;
  return (
    <Shell title={r.title} onClose={onClose}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm text-cream/90 [&_button]:text-cream">
        <dt className="text-cream/60">Team</dt>
        <dd>{area(r.areaId)?.name ?? "—"}</dd>
        <dt className="text-cream/60">Lead</dt>
        <dd>{r.leadId ? <PersonLink id={r.leadId} /> : "—"}</dd>
        <dt className="text-cream/60">Held by</dt>
        <dd>
          <People ids={r.holders} />
        </dd>
        <dt className="text-cream/60">Offered</dt>
        <dd>
          <People ids={r.interested} />
        </dd>
        <dt className="text-cream/60">Due</dt>
        <dd>{r.due ?? r.dueOn ?? "—"}</dd>
      </dl>
      {r.description && (
        <p className="text-sm whitespace-pre-line text-cream/80">
          {r.description}
        </p>
      )}
      {r.skills && (
        <p className="text-sm text-cream/70">
          <span className="font-semibold">Skills:</span> {r.skills}
        </p>
      )}
    </Shell>
  );
}

// ── Person ─────────────────────────────────────────────────────────────────

function PersonDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { board, person, canManage, act, open, role } = useBoard();
  const p = person(id);
  const [f, setF] = useState({
    name: p?.name ?? "",
    kind: p?.kind ?? ("volunteer" as PersonKind),
    areaId: p?.areaId ?? "",
    contact: p?.contact ?? "",
    note: p?.note ?? "",
  });
  const [email, setEmail] = useState(p?.account?.email ?? "");
  const set = (k: keyof typeof f) => (v: string) =>
    setF((x) => ({ ...x, [k]: v }));
  const d = p ? dutiesOf(board, p.id) : null;

  const duties = d && (
    <div className="space-y-2 rounded-lg bg-white/5 p-4 text-sm text-cream/90">
      <Duty label="In charge of" items={d.holds.map((r) => r.title)} />
      <Duty
        label="Lead for, unfilled"
        items={d.leads.filter((r) => !r.holders.length).map((r) => r.title)}
      />
      <Duty label="Offered to take" items={d.offered.map((r) => r.title)} />
      <Duty
        label="Open tasks"
        items={d.tasks.map(
          (t) => t.title + (t.roleId ? ` (${role(t.roleId)?.title})` : ""),
        )}
      />
      {canManage && (
        <button
          type="button"
          onClick={() =>
            open({ kind: "task", id: null, preset: { ownerId: p!.id } })
          }
          className="text-xs text-cream/60 underline-offset-2 hover:text-cream hover:underline"
        >
          Give them a task
        </button>
      )}
    </div>
  );

  if (!canManage && p)
    return (
      <Shell title={p.name} onClose={onClose}>
        <p className="text-sm text-cream/70">
          {p.kind === "staff" ? "Staff" : "Volunteer"}
          {p.contact && ` · ${p.contact}`}
        </p>
        {duties}
      </Shell>
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    act(
      () =>
        savePerson(id, {
          ...f,
          areaId: f.areaId || null,
          contact: f.contact || null,
          note: f.note || null,
        }),
      onClose,
    );
  };
  return (
    <Shell title={p ? p.name : "New person"} onClose={onClose}>
      {duties}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field name="Name">
          <input
            required
            autoFocus={!p}
            value={f.name}
            onChange={(e) => set("name")(e.currentTarget.value)}
            className={input}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="Staff or volunteer">
            <select
              value={f.kind}
              onChange={(e) => set("kind")(e.currentTarget.value)}
              className={select}
              style={selectStyle}
            >
              <option value="staff">Staff</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </Field>
          <Field name="Home team">
            <AreaSelect value={f.areaId} onChange={set("areaId")} />
          </Field>
        </div>
        <Field name="Contact (email or Discord)">
          <input
            value={f.contact}
            onChange={(e) => set("contact")(e.currentTarget.value)}
            className={input}
          />
        </Field>
        <Field name="Note">
          <textarea
            rows={2}
            value={f.note}
            onChange={(e) => set("note")(e.currentTarget.value)}
            className={input}
          />
        </Field>
        <Footer
          onClose={onClose}
          onDelete={
            p
              ? () => {
                  if (confirmDelete(`${p.name} from the board`))
                    act(() => removePerson(p.id), onClose);
                }
              : undefined
          }
          deleteLabel="Remove"
        />
      </form>
      {p && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => linkPerson(p.id, email || null));
          }}
          className="flex flex-col gap-2 border-t border-white/10 pt-4"
        >
          <Field name="Their account's email">
            <input
              type="email"
              value={email}
              placeholder="Links them to their site account"
              onChange={(e) => setEmail(e.currentTarget.value)}
              className={input}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="ghost" size="sm">
              {email ? "Link account" : "Unlink account"}
            </Button>
          </div>
        </form>
      )}
    </Shell>
  );
}

function Duty({ label: name, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <p>
      <span className="text-cream/60">{name}:</span> {items.join(" · ")}
    </p>
  );
}

// ── Task ───────────────────────────────────────────────────────────────────

type Preset = { ownerId?: string; areaId?: string; roleId?: string };

function TaskDialog({
  id,
  preset,
  onClose,
}: {
  id: string | null;
  preset?: Preset;
  onClose: () => void;
}) {
  const { board, canManage, act, role, area } = useBoard();
  const t = board.tasks.find((x) => x.id === id);
  const [f, setF] = useState({
    title: t?.title ?? "",
    areaId: t?.areaId ?? preset?.areaId ?? "",
    roleId: t?.roleId ?? preset?.roleId ?? "",
    ownerId: t?.ownerId ?? preset?.ownerId ?? "",
    status: t?.status ?? ("todo" as TaskStatus),
    dueOn: t?.dueOn ?? "",
  });
  const set = (k: keyof typeof f) => (v: string) =>
    setF((x) => ({ ...x, [k]: v }));

  if (!canManage && t)
    return (
      <Shell title={t.title} onClose={onClose}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm text-cream/90 [&_button]:text-cream">
          <dt className="text-cream/60">Owner</dt>
          <dd>{t.ownerId ? <PersonLink id={t.ownerId} /> : "Nobody yet"}</dd>
          <dt className="text-cream/60">Status</dt>
          <dd>{TASK_STATUS_LABELS[t.status]}</dd>
          <dt className="text-cream/60">Team · role</dt>
          <dd>
            {[area(t.areaId)?.name, role(t.roleId)?.title]
              .filter(Boolean)
              .join(" · ") || "—"}
          </dd>
          <dt className="text-cream/60">Due</dt>
          <dd>{t.dueOn ?? "—"}</dd>
        </dl>
      </Shell>
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    act(
      () =>
        saveTask(id, {
          ...f,
          areaId: f.areaId || null,
          roleId: f.roleId || null,
          ownerId: f.ownerId || null,
          dueOn: f.dueOn || null,
        }),
      onClose,
    );
  };
  return (
    <Shell title={t ? "Task" : "New task"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field name="Task">
          <input
            required
            autoFocus
            value={f.title}
            onChange={(e) => set("title")(e.currentTarget.value)}
            className={input}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="Owner">
            <PersonSelect
              value={f.ownerId}
              onChange={set("ownerId")}
              blank="No owner yet"
            />
          </Field>
          <Field name="Status">
            <select
              value={f.status}
              onChange={(e) => set("status")(e.currentTarget.value)}
              className={select}
              style={selectStyle}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field name="Team">
            <AreaSelect value={f.areaId} onChange={set("areaId")} />
          </Field>
          <Field name="Part of role">
            <select
              value={f.roleId}
              onChange={(e) => set("roleId")(e.currentTarget.value)}
              className={select}
              style={selectStyle}
            >
              <option value="">None</option>
              {board.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </Field>
          <Field name="Due">
            <input
              type="date"
              value={f.dueOn}
              onChange={(e) => set("dueOn")(e.currentTarget.value)}
              className={input}
            />
          </Field>
        </div>
        <Footer
          onClose={onClose}
          onDelete={
            t
              ? () => {
                  if (confirmDelete(`the task “${t.title}”`))
                    act(() => removeTask(t.id), onClose);
                }
              : undefined
          }
        />
      </form>
    </Shell>
  );
}

// ── Team (area) ────────────────────────────────────────────────────────────

function AreaDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { area, act } = useBoard();
  const a = area(id);
  const [name, setName] = useState(a?.name ?? "");
  return (
    <Shell
      title={a ? `Rename ${a.name}` : "New team"}
      description={a ? undefined : "Meta, Ops, Marketing, Volunteers, …"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(() => saveArea(id, name), onClose);
        }}
        className="flex flex-col gap-4"
      >
        <Field name="Name">
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            className={input}
          />
        </Field>
        <Footer
          onClose={onClose}
          onDelete={
            a
              ? () => {
                  if (
                    confirmDelete(
                      `the team ${a.name} (its people, roles and tasks stay, with no team)`,
                    )
                  )
                    act(() => removeArea(a.id), onClose);
                }
              : undefined
          }
        />
      </form>
    </Shell>
  );
}

// ── Several at once ────────────────────────────────────────────────────────

function PeopleDialog({ onClose }: { onClose: () => void }) {
  const { act } = useBoard();
  const [list, setList] = useState("");
  const [kind, setKind] = useState<PersonKind>("volunteer");
  const [areaId, setAreaId] = useState("");
  return (
    <Shell
      title="Add people"
      description="One name a line, or “Name, email”, pasted from Airtable or the volunteer sheet. Anyone already on the board is skipped."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(() => addPeopleList(list, kind, areaId || null), onClose);
        }}
        className="flex flex-col gap-4"
      >
        <textarea
          required
          autoFocus
          rows={8}
          value={list}
          onChange={(e) => setList(e.currentTarget.value)}
          aria-label="Names"
          className={input}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="They're">
            <select
              value={kind}
              onChange={(e) => setKind(e.currentTarget.value as PersonKind)}
              className={select}
              style={selectStyle}
            >
              <option value="volunteer">Volunteers</option>
              <option value="staff">Staff</option>
            </select>
          </Field>
          <Field name="Home team">
            <AreaSelect value={areaId} onChange={setAreaId} />
          </Field>
        </div>
        <Footer onClose={onClose} saveLabel="Add" />
      </form>
    </Shell>
  );
}

function TaskListDialog({
  preset,
  onClose,
}: {
  preset?: Preset;
  onClose: () => void;
}) {
  const { board, act } = useBoard();
  const [list, setList] = useState("");
  const [ownerId, setOwnerId] = useState(preset?.ownerId ?? "");
  const [areaId, setAreaId] = useState(preset?.areaId ?? "");
  const [roleId, setRoleId] = useState(preset?.roleId ?? "");
  return (
    <Shell
      title="Add tasks"
      description="One task a line, like a week's goals from the All Hands table."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(
            () =>
              addTaskList(list, {
                ownerId: ownerId || null,
                areaId: areaId || null,
                roleId: roleId || null,
                dueOn: null,
              }),
            onClose,
          );
        }}
        className="flex flex-col gap-4"
      >
        <textarea
          required
          autoFocus
          rows={8}
          value={list}
          onChange={(e) => setList(e.currentTarget.value)}
          aria-label="Tasks"
          className={input}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="Owner">
            <PersonSelect
              value={ownerId}
              onChange={setOwnerId}
              blank="No owner yet"
            />
          </Field>
          <Field name="Team">
            <AreaSelect value={areaId} onChange={setAreaId} />
          </Field>
          <Field name="Part of role">
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.currentTarget.value)}
              className={select}
              style={selectStyle}
            >
              <option value="">None</option>
              {board.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Footer onClose={onClose} saveLabel="Add" />
      </form>
    </Shell>
  );
}

// ── Import ─────────────────────────────────────────────────────────────────

function ImportDialog({ onClose }: { onClose: () => void }) {
  const { act } = useBoard();
  const [text, setText] = useState("");
  return (
    <Shell
      title="Import a board file"
      description="A board file from Export, or one written from the All Hands doc. It only adds: nobody is removed and nothing already on the board is overwritten, so importing it twice is safe."
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(() => importBoard(text), onClose);
        }}
        className="flex flex-col gap-4"
      >
        <input
          type="file"
          accept=".json,application/json"
          aria-label="Board file"
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            if (file) setText(await file.text());
          }}
          className="text-sm text-cream/80 file:mr-3 file:rounded-md file:border-0 file:bg-white/15 file:px-3 file:py-1.5 file:text-cream"
        />
        <textarea
          required
          rows={10}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder='{"areas": [...], "people": [...], "roles": [...], "tasks": [...]}'
          aria-label="Board file text"
          className={`${input} font-mono text-xs`}
        />
        <Footer onClose={onClose} saveLabel="Import" />
      </form>
    </Shell>
  );
}

const confirmDelete = (what: string) =>
  window.confirm(`Delete ${what}? This can't be undone.`);

export default function Dialogs({
  dialog,
  onClose,
}: {
  dialog: Open | null;
  onClose: () => void;
}) {
  if (!dialog) return null;
  const key = `${dialog.kind}-${"id" in dialog ? (dialog.id ?? "new") : ""}`;
  switch (dialog.kind) {
    case "role":
      return <RoleDialog key={key} id={dialog.id} onClose={onClose} />;
    case "person":
      return <PersonDialog key={key} id={dialog.id} onClose={onClose} />;
    case "task":
      return (
        <TaskDialog
          key={key}
          id={dialog.id}
          preset={dialog.preset}
          onClose={onClose}
        />
      );
    case "area":
      return <AreaDialog key={key} id={dialog.id} onClose={onClose} />;
    case "people":
      return <PeopleDialog key={key} onClose={onClose} />;
    case "tasks":
      return (
        <TaskListDialog key={key} preset={dialog.preset} onClose={onClose} />
      );
    case "import":
      return <ImportDialog key={key} onClose={onClose} />;
  }
}
