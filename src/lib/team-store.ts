import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  cleanName,
  findPerson,
  type Board,
  type BoardFile,
  type PersonKind,
  type RoleStatus,
  type Stake,
  type TaskStatus,
} from "./team";

const {
  teamAreas,
  teamPeople,
  teamRoles,
  teamRolePeople,
  teamTasks,
  user,
  roles,
  userRoles,
} = schema;

/** Accounts holding this role show up on the board as volunteers to add. */
export const VOLUNTEER_ROLE = "Volunteer";

export async function loadBoard(): Promise<Board> {
  const db = getDb();
  const [areas, people, roleRows, stakes, tasks, volunteers] =
    await Promise.all([
      db
        .select()
        .from(teamAreas)
        .orderBy(asc(teamAreas.position), asc(teamAreas.name)),
      db
        .select({
          person: teamPeople,
          accountName: user.name,
          accountEmail: user.email,
        })
        .from(teamPeople)
        .leftJoin(user, eq(user.id, teamPeople.userId))
        .orderBy(asc(teamPeople.name)),
      db.select().from(teamRoles).orderBy(asc(teamRoles.title)),
      db.select().from(teamRolePeople).orderBy(asc(teamRolePeople.createdAt)),
      db.select().from(teamTasks).orderBy(asc(teamTasks.createdAt)),
      db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .innerJoin(user, eq(user.id, userRoles.userId))
        .where(eq(roles.name, VOLUNTEER_ROLE))
        .orderBy(asc(user.name)),
    ]);
  const linked = new Set(people.map((p) => p.person.userId));
  const holders = (roleId: string, stake: Stake) =>
    stakes
      .filter((s) => s.roleId === roleId && s.stake === stake)
      .map((s) => s.personId);
  return {
    areas: areas.map(({ id, name, position }) => ({ id, name, position })),
    people: people.map(({ person: p, accountName, accountEmail }) => ({
      id: p.id,
      name: p.name,
      kind: p.kind as PersonKind,
      areaId: p.areaId,
      userId: p.userId,
      account:
        p.userId && accountEmail
          ? { name: accountName ?? accountEmail, email: accountEmail }
          : null,
      contact: p.contact,
      note: p.note,
    })),
    roles: roleRows.map((r) => ({
      id: r.id,
      title: r.title,
      areaId: r.areaId,
      leadId: r.leadId,
      description: r.description,
      skills: r.skills,
      needed: r.needed,
      due: r.due,
      dueOn: r.dueOn,
      status: r.status as RoleStatus,
      holders: holders(r.id, "assigned"),
      interested: holders(r.id, "interested"),
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      areaId: t.areaId,
      roleId: t.roleId,
      ownerId: t.ownerId,
      status: t.status as TaskStatus,
      dueOn: t.dueOn,
    })),
    volunteerAccounts: volunteers.filter((v) => !linked.has(v.id)),
  };
}

// ── Areas ──────────────────────────────────────────────────────────────────

export async function createArea(name: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ position: teamAreas.position })
    .from(teamAreas);
  const position = rows.reduce((m, r) => Math.max(m, r.position), -1) + 1;
  await db.insert(teamAreas).values({ name, position });
}

export async function renameArea(id: string, name: string): Promise<void> {
  await getDb().update(teamAreas).set({ name }).where(eq(teamAreas.id, id));
}

export async function deleteArea(id: string): Promise<void> {
  await getDb().delete(teamAreas).where(eq(teamAreas.id, id));
}

// ── People ─────────────────────────────────────────────────────────────────

export type PersonInput = {
  name: string;
  kind: PersonKind;
  areaId: string | null;
  contact: string | null;
  note: string | null;
};

/** Adds everyone not already on the board by that name; returns how many. */
export async function addPeople(list: PersonInput[]): Promise<number> {
  if (list.length === 0) return 0;
  const made = await getDb()
    .insert(teamPeople)
    .values(list)
    .onConflictDoNothing({ target: teamPeople.name })
    .returning({ id: teamPeople.id });
  return made.length;
}

export async function updatePerson(
  id: string,
  input: PersonInput,
): Promise<void> {
  await getDb().update(teamPeople).set(input).where(eq(teamPeople.id, id));
}

export async function deletePerson(id: string): Promise<void> {
  await getDb().delete(teamPeople).where(eq(teamPeople.id, id));
}

/** Links an account to a person who has none; false if they already do. */
export async function linkAccount(
  personId: string,
  userId: string,
): Promise<boolean> {
  const done = await getDb()
    .update(teamPeople)
    .set({ userId })
    .where(and(eq(teamPeople.id, personId), isNull(teamPeople.userId)))
    .returning({ id: teamPeople.id });
  return done.length > 0;
}

export async function unlinkAccount(personId: string): Promise<void> {
  await getDb()
    .update(teamPeople)
    .set({ userId: null })
    .where(eq(teamPeople.id, personId));
}

export async function personForUser(userId: string) {
  const [row] = await getDb()
    .select({ id: teamPeople.id })
    .from(teamPeople)
    .where(eq(teamPeople.userId, userId))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Puts accounts on the board as volunteers. One whose name is already there
 * unlinked gets linked instead of doubled.
 */
export async function addAccounts(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const db = getDb();
  const [accounts, people] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(inArray(user.id, userIds)),
    db
      .select({
        id: teamPeople.id,
        name: teamPeople.name,
        userId: teamPeople.userId,
      })
      .from(teamPeople),
  ]);
  let added = 0;
  for (const a of accounts) {
    if (people.some((p) => p.userId === a.id)) continue;
    const name = cleanName(a.name || a.email);
    const same = people.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (same && !same.userId) {
      if (await linkAccount(same.id, a.id)) added++;
      continue;
    }
    const made = await db
      .insert(teamPeople)
      .values({
        name: same ? `${name} (${a.email})` : name,
        kind: "volunteer",
        userId: a.id,
        contact: a.email,
      })
      .onConflictDoNothing()
      .returning({ id: teamPeople.id });
    added += made.length;
  }
  return added;
}

// ── Roles ──────────────────────────────────────────────────────────────────

export type RoleInput = {
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

export async function createRole(input: RoleInput): Promise<string> {
  const [made] = await getDb()
    .insert(teamRoles)
    .values(input)
    .returning({ id: teamRoles.id });
  return made.id;
}

export async function updateRole(id: string, input: RoleInput): Promise<void> {
  await getDb().update(teamRoles).set(input).where(eq(teamRoles.id, id));
}

export async function deleteRole(id: string): Promise<void> {
  await getDb().delete(teamRoles).where(eq(teamRoles.id, id));
}

/** Who holds or has offered to take a role; null takes them off it. */
export async function setStake(
  roleId: string,
  personId: string,
  stake: Stake | null,
): Promise<void> {
  const db = getDb();
  const where = and(
    eq(teamRolePeople.roleId, roleId),
    eq(teamRolePeople.personId, personId),
  );
  if (stake === null) {
    await db.delete(teamRolePeople).where(where);
    return;
  }
  await db
    .insert(teamRolePeople)
    .values({ roleId, personId, stake })
    .onConflictDoUpdate({
      target: [teamRolePeople.roleId, teamRolePeople.personId],
      set: { stake },
    });
}

/** An offer to take a role, which never demotes someone already holding it. */
export async function offer(roleId: string, personId: string): Promise<void> {
  await getDb()
    .insert(teamRolePeople)
    .values({ roleId, personId, stake: "interested" })
    .onConflictDoNothing();
}

/** Takes back an offer; holding the role is a manager's to undo. */
export async function withdrawOffer(
  roleId: string,
  personId: string,
): Promise<void> {
  await getDb()
    .delete(teamRolePeople)
    .where(
      and(
        eq(teamRolePeople.roleId, roleId),
        eq(teamRolePeople.personId, personId),
        eq(teamRolePeople.stake, "interested"),
      ),
    );
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export type TaskInput = {
  title: string;
  areaId: string | null;
  roleId: string | null;
  ownerId: string | null;
  status: TaskStatus;
  dueOn: string | null;
};

export async function addTasks(list: TaskInput[]): Promise<number> {
  if (list.length === 0) return 0;
  const made = await getDb()
    .insert(teamTasks)
    .values(list)
    .returning({ id: teamTasks.id });
  return made.length;
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  await getDb().update(teamTasks).set(input).where(eq(teamTasks.id, id));
}

export async function patchTask(
  id: string,
  patch: Partial<Pick<TaskInput, "status" | "ownerId">>,
): Promise<void> {
  await getDb().update(teamTasks).set(patch).where(eq(teamTasks.id, id));
}

export async function deleteTask(id: string): Promise<void> {
  await getDb().delete(teamTasks).where(eq(teamTasks.id, id));
}

// ── Import ─────────────────────────────────────────────────────────────────

export type ImportCounts = {
  areas: number;
  people: number;
  roles: number;
  /** Existing roles that got a blank filled in. */
  rolesFilledIn: number;
  stakes: number;
  tasks: number;
};

/**
 * Adds what a board file has and the board doesn't, matching by name. It
 * never deletes and never overwrites: an existing role only gets its blanks
 * filled, so importing the same file twice changes nothing.
 */
export async function importBoard(file: BoardFile): Promise<ImportCounts> {
  const db = getDb();
  const counts: ImportCounts = {
    areas: 0,
    people: 0,
    roles: 0,
    rolesFilledIn: 0,
    stakes: 0,
    tasks: 0,
  };
  const fileRoles = file.roles ?? [];
  const fileTasks = file.tasks ?? [];
  const filePeople = file.people ?? [];

  // Areas, in the file's order after the ones already there.
  const areas = await db.select().from(teamAreas);
  const areaId = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]));
  const areaNames = [
    ...(file.areas ?? []),
    ...filePeople.map((p) => p.area),
    ...fileRoles.map((r) => r.area),
    ...fileTasks.map((t) => t.area),
  ].filter((n): n is string => !!n);
  const newAreas = [
    ...new Map(
      areaNames
        .filter((n) => !areaId.has(n.toLowerCase()))
        .map((n) => [n.toLowerCase(), n]),
    ).values(),
  ];
  let position = areas.reduce((m, a) => Math.max(m, a.position), -1) + 1;
  if (newAreas.length) {
    const made = await db
      .insert(teamAreas)
      .values(newAreas.map((name) => ({ name, position: position++ })))
      .onConflictDoNothing()
      .returning();
    for (const a of made) areaId.set(a.name.toLowerCase(), a.id);
    counts.areas = made.length;
  }
  const area = (name: string | null | undefined) =>
    name ? (areaId.get(name.toLowerCase()) ?? null) : null;

  // People: the file's own, then anyone a role or task names who isn't on
  // the board yet. Someone already there only gets blanks filled.
  const existing = await db.select().from(teamPeople);
  const known: { id: string | null; name: string }[] = existing.map((p) => ({
    id: p.id,
    name: p.name,
  }));
  const toAdd: PersonInput[] = [];
  for (const p of filePeople) {
    const match = findPerson(p.name, known);
    if (match?.id) {
      const row = existing.find((e) => e.id === match.id)!;
      const fill = {
        ...(!row.areaId && area(p.area) ? { areaId: area(p.area) } : {}),
        ...(!row.contact && p.contact ? { contact: p.contact } : {}),
        ...(!row.note && p.note ? { note: p.note } : {}),
      };
      if (Object.keys(fill).length)
        await db.update(teamPeople).set(fill).where(eq(teamPeople.id, row.id));
      continue;
    }
    if (match) continue;
    known.push({ id: null, name: p.name });
    toAdd.push({
      name: p.name,
      kind: p.kind ?? "volunteer",
      areaId: area(p.area),
      contact: p.contact ?? null,
      note: p.note ?? null,
    });
  }
  const referenced: { name: string; kind: PersonKind }[] = [
    ...fileRoles.flatMap((r) => [
      ...(r.lead ? [{ name: r.lead, kind: "staff" as const }] : []),
      ...[...(r.assigned ?? []), ...(r.interested ?? [])].map((name) => ({
        name,
        kind: "volunteer" as const,
      })),
    ]),
    ...fileTasks.flatMap((t) =>
      t.owner ? [{ name: t.owner, kind: "volunteer" as const }] : [],
    ),
  ];
  for (const r of referenced) {
    if (findPerson(r.name, known)) continue;
    const name = cleanName(r.name);
    known.push({ id: null, name });
    toAdd.push({ name, kind: r.kind, areaId: null, contact: null, note: null });
  }
  if (toAdd.length) {
    const made = await db
      .insert(teamPeople)
      .values(toAdd)
      .onConflictDoNothing({ target: teamPeople.name })
      .returning({ id: teamPeople.id, name: teamPeople.name });
    counts.people = made.length;
    for (const m of made) {
      const k = known.find((p) => p.id === null && p.name === m.name);
      if (k) k.id = m.id;
    }
  }
  const personId = (name: string | null | undefined) =>
    name ? (findPerson(name, known)?.id ?? null) : null;

  // Roles by title, then who holds or wants each.
  const roleRows = await db.select().from(teamRoles);
  const roleId = new Map(roleRows.map((r) => [r.title.toLowerCase(), r.id]));
  const newRoles = fileRoles.filter((r) => !roleId.has(r.title.toLowerCase()));
  if (newRoles.length) {
    const made = await db
      .insert(teamRoles)
      .values(
        newRoles.map((r) => ({
          title: r.title,
          areaId: area(r.area),
          leadId: personId(r.lead),
          description: r.description ?? null,
          skills: r.skills ?? null,
          needed: r.needed ?? 1,
          due: r.due ?? null,
          dueOn: r.dueOn ?? null,
          status: r.status ?? "active",
        })),
      )
      .onConflictDoNothing()
      .returning({ id: teamRoles.id, title: teamRoles.title });
    for (const m of made) roleId.set(m.title.toLowerCase(), m.id);
    counts.roles = made.length;
  }
  for (const r of fileRoles) {
    const row = roleRows.find(
      (x) => x.title.toLowerCase() === r.title.toLowerCase(),
    );
    if (!row) continue;
    const fill = {
      ...(!row.areaId && area(r.area) ? { areaId: area(r.area) } : {}),
      ...(!row.leadId && personId(r.lead) ? { leadId: personId(r.lead) } : {}),
      ...(!row.description && r.description
        ? { description: r.description }
        : {}),
      ...(!row.skills && r.skills ? { skills: r.skills } : {}),
      ...(!row.due && r.due ? { due: r.due } : {}),
      ...(!row.dueOn && r.dueOn ? { dueOn: r.dueOn } : {}),
    };
    if (Object.keys(fill).length) {
      await db.update(teamRoles).set(fill).where(eq(teamRoles.id, row.id));
      counts.rolesFilledIn++;
    }
  }

  const stakes = await db.select().from(teamRolePeople);
  const has = new Map(stakes.map((s) => [`${s.roleId}|${s.personId}`, s]));
  const newStakes = new Map<
    string,
    { roleId: string; personId: string; stake: Stake }
  >();
  for (const r of fileRoles) {
    const rid = roleId.get(r.title.toLowerCase());
    if (!rid) continue;
    const want: [string, Stake][] = [
      ...(r.interested ?? []).map((n) => [n, "interested"] as [string, Stake]),
      ...(r.assigned ?? []).map((n) => [n, "assigned"] as [string, Stake]),
    ];
    for (const [name, stake] of want) {
      const pid = personId(name);
      if (!pid) continue;
      const key = `${rid}|${pid}`;
      const now = has.get(key);
      if (now?.stake === "assigned") continue;
      if (now && stake === "interested") continue;
      if (now) {
        await setStake(rid, pid, "assigned");
        counts.stakes++;
        continue;
      }
      newStakes.set(key, { roleId: rid, personId: pid, stake });
    }
  }
  if (newStakes.size) {
    const made = await db
      .insert(teamRolePeople)
      .values([...newStakes.values()])
      .onConflictDoNothing()
      .returning({ roleId: teamRolePeople.roleId });
    counts.stakes += made.length;
  }

  // Tasks, skipping one the same owner already has by that title.
  const taskRows = await db.select().from(teamTasks);
  const taken = new Set(
    taskRows.map((t) => `${t.title.toLowerCase()}|${t.ownerId ?? ""}`),
  );
  const newTasks: TaskInput[] = [];
  for (const t of fileTasks) {
    const ownerId = personId(t.owner);
    const key = `${t.title.toLowerCase()}|${ownerId ?? ""}`;
    if (taken.has(key)) continue;
    taken.add(key);
    newTasks.push({
      title: t.title,
      ownerId,
      areaId: area(t.area),
      roleId: t.role ? (roleId.get(t.role.toLowerCase()) ?? null) : null,
      status: t.status ?? "todo",
      dueOn: t.dueOn ?? null,
    });
  }
  counts.tasks = await addTasks(newTasks);
  return counts;
}
