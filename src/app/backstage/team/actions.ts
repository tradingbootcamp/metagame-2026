"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { can } from "@/lib/access";
import {
  cleanName,
  parseBoardFile,
  parseNameList,
  PERSON_KINDS,
  ROLE_STATUSES,
  STAKES,
  TASK_STATUSES,
  type PersonKind,
  type RoleStatus,
  type Stake,
  type TaskStatus,
} from "@/lib/team";
import * as store from "@/lib/team-store";

export type Result = { error?: string; message?: string };

const PATH = "/backstage/team";
const NAME_MAX = 80;
const TEXT_MAX = 4000;

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

class Invalid extends Error {}

function text(v: unknown, what: string, max = TEXT_MAX): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") throw new Invalid(`${what} isn't text.`);
  const s = v.trim();
  if (s.length > max) throw new Invalid(`${what}: at most ${max} characters.`);
  return s || null;
}

function required(v: unknown, what: string): string {
  const s = text(v, what, NAME_MAX);
  if (!s) throw new Invalid(`Give it a ${what.toLowerCase()}.`);
  return cleanName(s);
}

const day = (v: unknown): string | null => {
  const s = text(v, "Date", 10);
  if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Invalid("Bad date.");
  return s;
};

const id = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null;

function oneOf<T extends string>(list: readonly T[], v: unknown, what: string) {
  if (typeof v === "string" && (list as readonly string[]).includes(v))
    return v as T;
  throw new Invalid(`Unknown ${what}.`);
}

async function run(
  gate: "team.manage" | "team.view",
  work: (userId: string) => Promise<string | void>,
): Promise<Result> {
  const session = await can(gate);
  if (!session)
    return {
      error:
        gate === "team.manage"
          ? "Sign in with an account that manages the team board."
          : "Sign in with an account that can see the team board.",
    };
  try {
    const done = await work(session.user.id);
    revalidatePath(PATH);
    return done ? { message: done } : {};
  } catch (err) {
    const msg = message(err);
    return {
      error: /unique|duplicate/i.test(msg)
        ? "That name is already on the board."
        : msg,
    };
  }
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

// ── Areas ──────────────────────────────────────────────────────────────────

export async function saveArea(areaId: string | null, name: string) {
  return run("team.manage", async () => {
    const clean = required(name, "Name");
    if (areaId) await store.renameArea(areaId, clean);
    else await store.createArea(clean);
  });
}

export async function removeArea(areaId: string) {
  return run("team.manage", () => store.deleteArea(areaId));
}

// ── People ─────────────────────────────────────────────────────────────────

export type PersonFields = {
  name: string;
  kind: PersonKind;
  areaId: string | null;
  contact: string | null;
  note: string | null;
};

const personInput = (f: PersonFields): store.PersonInput => ({
  name: required(f.name, "Name"),
  kind: oneOf(PERSON_KINDS, f.kind, "kind"),
  areaId: id(f.areaId),
  contact: text(f.contact, "Contact", 200),
  note: text(f.note, "Note"),
});

export async function savePerson(personId: string | null, f: PersonFields) {
  return run("team.manage", async () => {
    const input = personInput(f);
    if (personId) await store.updatePerson(personId, input);
    else if ((await store.addPeople([input])) === 0)
      throw new Invalid("That name is already on the board.");
  });
}

export async function removePerson(personId: string) {
  return run("team.manage", () => store.deletePerson(personId));
}

/** One name a line, optionally "Name, contact", all of one kind and team. */
export async function addPeopleList(
  list: string,
  kind: PersonKind,
  areaId: string | null,
) {
  return run("team.manage", async () => {
    const k = oneOf(PERSON_KINDS, kind, "kind");
    const rows = parseNameList(text(list, "List", 20000) ?? "");
    if (rows.length === 0) throw new Invalid("Paste at least one name.");
    const added = await store.addPeople(
      rows.map((r) => ({
        name: r.name.slice(0, NAME_MAX),
        kind: k,
        areaId: id(areaId),
        contact: r.contact,
        note: null,
      })),
    );
    const skipped = rows.length - added;
    return `Added ${plural(added, "person", "people")}${
      skipped ? `; ${skipped} already on the board` : ""
    }.`;
  });
}

export async function addVolunteerAccounts(userIds: string[]) {
  return run("team.manage", async () => {
    const added = await store.addAccounts(userIds.filter((u) => !!id(u)));
    return `Added ${plural(added, "volunteer")}.`;
  });
}

/** Links a person to the account with this email, or unlinks them. */
export async function linkPerson(personId: string, email: string | null) {
  return run("team.manage", async () => {
    const clean = text(email, "Email", 200)?.toLowerCase() ?? null;
    if (!clean) return store.unlinkAccount(personId);
    const [account] = await getDb()
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, clean))
      .limit(1);
    if (!account) throw new Invalid("No account has that email.");
    if (await store.personForUser(account.id))
      throw new Invalid("That account is already someone on the board.");
    await store.unlinkAccount(personId);
    if (!(await store.linkAccount(personId, account.id)))
      throw new Invalid("Couldn't link them. Reload and try again.");
  });
}

/** "This is me": links the signed-in account to someone not yet linked. */
export async function claimPerson(personId: string) {
  return run("team.view", async (userId) => {
    if (await store.personForUser(userId))
      throw new Invalid("Your account is already on the board.");
    if (!(await store.linkAccount(personId, userId)))
      throw new Invalid("Someone else's account is linked to them.");
  });
}

// ── Roles ──────────────────────────────────────────────────────────────────

export type RoleFields = {
  title: string;
  areaId: string | null;
  leadId: string | null;
  description: string | null;
  skills: string | null;
  needed: number;
  due: string | null;
  dueOn: string | null;
  status: RoleStatus;
};

const roleInput = (f: RoleFields): store.RoleInput => {
  const needed = Number(f.needed);
  if (!Number.isInteger(needed) || needed < 0 || needed > 500)
    throw new Invalid("People needed is a whole number, 0 for anyone.");
  return {
    title: required(f.title, "Title"),
    areaId: id(f.areaId),
    leadId: id(f.leadId),
    description: text(f.description, "Description"),
    skills: text(f.skills, "Skills", 1000),
    needed,
    due: text(f.due, "Due", 200),
    dueOn: day(f.dueOn),
    status: oneOf(ROLE_STATUSES, f.status, "status"),
  };
};

export async function saveRole(roleId: string | null, f: RoleFields) {
  return run("team.manage", async () => {
    const input = roleInput(f);
    if (roleId) await store.updateRole(roleId, input);
    else await store.createRole(input);
  });
}

export async function removeRole(roleId: string) {
  return run("team.manage", () => store.deleteRole(roleId));
}

/** Assigns someone to a role, marks them interested, or takes them off. */
export async function setStake(
  roleId: string,
  personId: string,
  stake: Stake | null,
) {
  return run("team.manage", () =>
    store.setStake(
      roleId,
      personId,
      stake === null ? null : oneOf(STAKES, stake, "stake"),
    ),
  );
}

/** The signed-in person offers to take a role, or takes the offer back. */
export async function offer(roleId: string, on: boolean) {
  return run("team.view", async (userId) => {
    const me = await store.personForUser(userId);
    if (!me) throw new Invalid("Find yourself on the board first.");
    if (on) await store.offer(roleId, me);
    else await store.withdrawOffer(roleId, me);
  });
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export type TaskFields = {
  title: string;
  areaId: string | null;
  roleId: string | null;
  ownerId: string | null;
  status: TaskStatus;
  dueOn: string | null;
};

const taskInput = (f: TaskFields): store.TaskInput => ({
  title: required(f.title, "Title"),
  areaId: id(f.areaId),
  roleId: id(f.roleId),
  ownerId: id(f.ownerId),
  status: oneOf(TASK_STATUSES, f.status, "status"),
  dueOn: day(f.dueOn),
});

export async function saveTask(taskId: string | null, f: TaskFields) {
  return run("team.manage", async () => {
    const input = taskInput(f);
    if (taskId) await store.updateTask(taskId, input);
    else await store.addTasks([input]);
  });
}

/** One task a line, all for the same owner, team and role. */
export async function addTaskList(
  list: string,
  shared: Omit<TaskFields, "title" | "status">,
) {
  return run("team.manage", async () => {
    const titles = (text(list, "List", 20000) ?? "")
      .split(/\r?\n/)
      .map((l) => cleanName(l.replace(/^\s*[-*•]\s*/, "")))
      .filter(Boolean);
    if (titles.length === 0) throw new Invalid("Write at least one task.");
    const added = await store.addTasks(
      titles.map((title) =>
        taskInput({
          ...shared,
          title: title.slice(0, NAME_MAX),
          status: "todo",
        }),
      ),
    );
    return `Added ${plural(added, "task")}.`;
  });
}

/**
 * A status change from the list. Managers can change any task; anyone who
 * can see the board can tick off their own.
 */
export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const next = TASK_STATUSES.includes(status) ? status : null;
  if (!next) return { error: "Unknown status." };
  if (await can("team.manage"))
    return run("team.manage", () => store.patchTask(taskId, { status: next }));
  return run("team.view", async (userId) => {
    const me = await store.personForUser(userId);
    const [task] = await getDb()
      .select({ ownerId: schema.teamTasks.ownerId })
      .from(schema.teamTasks)
      .where(eq(schema.teamTasks.id, taskId))
      .limit(1);
    if (!me || task?.ownerId !== me)
      throw new Invalid("Only its owner or a board manager can change that.");
    await store.patchTask(taskId, { status: next });
  });
}

export async function setTaskOwner(taskId: string, ownerId: string | null) {
  return run("team.manage", () =>
    store.patchTask(taskId, { ownerId: id(ownerId) }),
  );
}

export async function removeTask(taskId: string) {
  return run("team.manage", () => store.deleteTask(taskId));
}

// ── Import ─────────────────────────────────────────────────────────────────

export async function importBoard(fileText: string) {
  return run("team.manage", async () => {
    const parsed = parseBoardFile(fileText);
    if ("error" in parsed) throw new Invalid(parsed.error);
    const c = await store.importBoard(parsed.file);
    const parts = [
      c.areas && plural(c.areas, "team"),
      c.people && plural(c.people, "person", "people"),
      c.roles && plural(c.roles, "role"),
      c.rolesFilledIn && `${plural(c.rolesFilledIn, "role")} filled in`,
      c.stakes && plural(c.stakes, "assignment"),
      c.tasks && plural(c.tasks, "task"),
    ].filter(Boolean);
    return parts.length
      ? `Imported ${parts.join(", ")}.`
      : "Nothing new: the board already has everything in that file.";
  });
}
