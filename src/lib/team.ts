// The team board's shapes and the pure logic over them: who still needs
// filling, what's overdue, and the board file the tool imports and exports.
// The queries are in team-store.ts.

export const PERSON_KINDS = ["staff", "volunteer"] as const;
export type PersonKind = (typeof PERSON_KINDS)[number];

export const STAKES = ["assigned", "interested"] as const;
export type Stake = (typeof STAKES)[number];

export const ROLE_STATUSES = ["active", "done", "dropped"] as const;
export type RoleStatus = (typeof ROLE_STATUSES)[number];

export const TASK_STATUSES = ["todo", "doing", "done", "dropped"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
  dropped: "Dropped",
};

export type Area = { id: string; name: string; position: number };

export type Person = {
  id: string;
  name: string;
  kind: PersonKind;
  areaId: string | null;
  userId: string | null;
  /** The linked account, for the badge and the "you" view. */
  account: { name: string; email: string } | null;
  contact: string | null;
  note: string | null;
};

export type Role = {
  id: string;
  title: string;
  areaId: string | null;
  leadId: string | null;
  description: string | null;
  skills: string | null;
  needed: number;
  due: string | null;
  dueOn: string | null;
  status: RoleStatus;
  /** Person ids, in the order they joined. */
  holders: string[];
  interested: string[];
};

export type Task = {
  id: string;
  title: string;
  areaId: string | null;
  roleId: string | null;
  ownerId: string | null;
  status: TaskStatus;
  dueOn: string | null;
};

export type Account = { id: string; name: string; email: string };

export type Board = {
  areas: Area[];
  people: Person[];
  roles: Role[];
  tasks: Task[];
  /** Accounts holding the Volunteer role that no one on the board is linked to. */
  volunteerAccounts: Account[];
};

/**
 * Where a role stands. "short" holds some of the people it needs; "ongoing"
 * takes as many as want to help and has at least one.
 */
export type Staffing = "open" | "short" | "filled" | "ongoing" | "closed";

type Staffable = Pick<Role, "needed" | "status" | "holders">;

export function staffing(role: Staffable): Staffing {
  if (role.status !== "active") return "closed";
  const held = role.holders.length;
  if (role.needed <= 0) return held === 0 ? "open" : "ongoing";
  if (held === 0) return "open";
  return held < role.needed ? "short" : "filled";
}

export const needsPeople = (role: Staffable) => {
  const s = staffing(role);
  return s === "open" || s === "short";
};

/** Empty seats; a role that takes anyone counts one until someone holds it. */
export function seatsLeft(role: Staffable): number {
  if (role.status !== "active") return 0;
  if (role.needed <= 0) return role.holders.length === 0 ? 1 : 0;
  return Math.max(0, role.needed - role.holders.length);
}

export const isOpenTask = (t: Pick<Task, "status">) =>
  t.status === "todo" || t.status === "doing";

/** Dates are ISO days, so they compare as strings. */
export const isOverdue = (dueOn: string | null, today: string) =>
  dueOn !== null && dueOn < today;

/** Today in Pacific time, where the con happens, as an ISO day. */
export function pacificToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(now);
}

/** Soonest deadline first, undated last, then by name. */
export function byDue<T extends { dueOn: string | null }>(
  name: (x: T) => string,
): (a: T, b: T) => number {
  return (a, b) => {
    if (a.dueOn !== b.dueOn) {
      if (a.dueOn === null) return 1;
      if (b.dueOn === null) return -1;
      return a.dueOn < b.dueOn ? -1 : 1;
    }
    return name(a).localeCompare(name(b));
  };
}

export type Summary = {
  people: number;
  staff: number;
  volunteers: number;
  /** Active roles still short of people, and the seats they have empty. */
  rolesToFill: number;
  seats: number;
  rolesFilled: number;
  openTasks: number;
  tasksWithoutOwner: number;
  /** Open tasks and unfilled roles past their deadline. */
  overdue: number;
  /** People holding no role and owning no open task. */
  unplaced: number;
};

export function summarize(board: Board, today: string): Summary {
  const active = board.roles.filter((r) => r.status === "active");
  const toFill = active.filter(needsPeople);
  const open = board.tasks.filter(isOpenTask);
  const placed = new Set([
    ...active.flatMap((r) => r.holders),
    ...open.flatMap((t) => (t.ownerId ? [t.ownerId] : [])),
  ]);
  return {
    people: board.people.length,
    staff: board.people.filter((p) => p.kind === "staff").length,
    volunteers: board.people.filter((p) => p.kind === "volunteer").length,
    rolesToFill: toFill.length,
    seats: toFill.reduce((n, r) => n + seatsLeft(r), 0),
    rolesFilled: active.length - toFill.length,
    openTasks: open.length,
    tasksWithoutOwner: open.filter((t) => !t.ownerId).length,
    overdue:
      open.filter((t) => isOverdue(t.dueOn, today)).length +
      toFill.filter((r) => isOverdue(r.dueOn, today)).length,
    unplaced: board.people.filter((p) => !placed.has(p.id)).length,
  };
}

/** What one person is in charge of, and what they've offered to take. */
export function dutiesOf(board: Board, personId: string) {
  return {
    holds: board.roles.filter(
      (r) => r.status === "active" && r.holders.includes(personId),
    ),
    offered: board.roles.filter(
      (r) => needsPeople(r) && r.interested.includes(personId),
    ),
    leads: board.roles.filter(
      (r) => r.status === "active" && r.leadId === personId,
    ),
    tasks: board.tasks.filter((t) => t.ownerId === personId && isOpenTask(t)),
  };
}

/**
 * The person `name` refers to: the same name, else the only one with that
 * first name ("Ben" for "Ben Karcher"). Case-insensitive; null if none or
 * ambiguous, so an import makes a new person rather than guess.
 */
export function findPerson<P extends { name: string }>(
  name: string,
  people: readonly P[],
): P | null {
  const lower = cleanName(name).toLowerCase();
  if (!lower) return null;
  const exact = people.find((p) => p.name.toLowerCase() === lower);
  if (exact) return exact;
  if (/\s/.test(lower)) return null;
  const same = people.filter(
    (p) => p.name.toLowerCase().split(/\s+/)[0] === lower,
  );
  return same.length === 1 ? same[0] : null;
}

export const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");

// ── The board file ─────────────────────────────────────────────────────────
// What Import takes and Export gives: everything by name instead of id, so a
// file written by hand (or from the All Hands doc) reads the same.

export type BoardFile = {
  areas?: string[];
  people?: {
    name: string;
    kind?: PersonKind;
    area?: string | null;
    contact?: string | null;
    note?: string | null;
  }[];
  roles?: {
    title: string;
    area?: string | null;
    lead?: string | null;
    description?: string | null;
    skills?: string | null;
    needed?: number;
    due?: string | null;
    dueOn?: string | null;
    status?: RoleStatus;
    assigned?: string[];
    interested?: string[];
  }[];
  tasks?: {
    title: string;
    owner?: string | null;
    area?: string | null;
    role?: string | null;
    status?: TaskStatus;
    dueOn?: string | null;
  }[];
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

/** Checks a pasted board file, naming the first thing wrong with it. */
export function parseBoardFile(
  text: string,
): { file: BoardFile } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "That isn't a board file: it doesn't read as JSON." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return { error: "A board file is one JSON object." };
  const f = raw as Record<string, unknown>;
  const list = (key: string) => {
    const v = f[key];
    if (v === undefined) return [];
    return Array.isArray(v) ? v : null;
  };
  const areas = list("areas");
  const people = list("people");
  const roles = list("roles");
  const tasks = list("tasks");
  if (!areas || !people || !roles || !tasks)
    return { error: "areas, people, roles and tasks must each be a list." };

  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const names = (v: unknown) =>
    Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : [];
  const day = (v: unknown, what: string) => {
    const s = str(v);
    if (s && !ISO_DAY.test(s))
      throw new Error(`${what}: dates are YYYY-MM-DD.`);
    return s;
  };

  try {
    const file: BoardFile = {
      areas: areas.map((a, i) => {
        const name = str(a);
        if (!name) throw new Error(`Area ${i + 1} has no name.`);
        return name;
      }),
      people: people.map((p, i) => {
        const o = (p ?? {}) as Record<string, unknown>;
        const name = str(o.name);
        if (!name) throw new Error(`Person ${i + 1} has no name.`);
        if (o.kind !== undefined && !isOneOf(PERSON_KINDS, o.kind))
          throw new Error(`${name}: kind is "staff" or "volunteer".`);
        return {
          name: cleanName(name),
          kind: (o.kind as PersonKind | undefined) ?? "volunteer",
          area: str(o.area),
          contact: str(o.contact),
          note: str(o.note),
        };
      }),
      roles: roles.map((r, i) => {
        const o = (r ?? {}) as Record<string, unknown>;
        const title = str(o.title);
        if (!title) throw new Error(`Role ${i + 1} has no title.`);
        if (o.status !== undefined && !isOneOf(ROLE_STATUSES, o.status))
          throw new Error(`${title}: status is active, done or dropped.`);
        const needed = o.needed === undefined ? 1 : Number(o.needed);
        if (!Number.isInteger(needed) || needed < 0)
          throw new Error(`${title}: needed is a whole number, 0 for anyone.`);
        return {
          title,
          area: str(o.area),
          lead: str(o.lead),
          description: str(o.description),
          skills: str(o.skills),
          needed,
          due: str(o.due),
          dueOn: day(o.dueOn, title),
          status: (o.status as RoleStatus | undefined) ?? "active",
          assigned: names(o.assigned),
          interested: names(o.interested),
        };
      }),
      tasks: tasks.map((t, i) => {
        const o = (t ?? {}) as Record<string, unknown>;
        const title = str(o.title);
        if (!title) throw new Error(`Task ${i + 1} has no title.`);
        if (o.status !== undefined && !isOneOf(TASK_STATUSES, o.status))
          throw new Error(`${title}: status is todo, doing, done or dropped.`);
        return {
          title,
          owner: str(o.owner),
          area: str(o.area),
          role: str(o.role),
          status: (o.status as TaskStatus | undefined) ?? "todo",
          dueOn: day(o.dueOn, title),
        };
      }),
    };
    return { file };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** The board as a file, for Export: ids become names. */
export function toBoardFile(board: Board): BoardFile {
  const area = (id: string | null) =>
    board.areas.find((a) => a.id === id)?.name ?? null;
  const person = (id: string | null) =>
    board.people.find((p) => p.id === id)?.name ?? null;
  const named = (ids: string[]) =>
    ids.map(person).filter((n): n is string => !!n);
  return {
    areas: board.areas.map((a) => a.name),
    people: board.people.map((p) => ({
      name: p.name,
      kind: p.kind,
      area: area(p.areaId),
      contact: p.contact,
      note: p.note,
    })),
    roles: board.roles.map((r) => ({
      title: r.title,
      area: area(r.areaId),
      lead: person(r.leadId),
      description: r.description,
      skills: r.skills,
      needed: r.needed,
      due: r.due,
      dueOn: r.dueOn,
      status: r.status,
      assigned: named(r.holders),
      interested: named(r.interested),
    })),
    tasks: board.tasks.map((t) => ({
      title: t.title,
      owner: person(t.ownerId),
      area: area(t.areaId),
      role: board.roles.find((r) => r.id === t.roleId)?.title ?? null,
      status: t.status,
      dueOn: t.dueOn,
    })),
  };
}

/** One name per line, or "Name, contact"; blank lines and repeats dropped. */
export function parseNameList(
  text: string,
): { name: string; contact: string | null }[] {
  const seen = new Set<string>();
  const out: { name: string; contact: string | null }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const [rawName, ...rest] = line.split(/[,\t]/);
    const name = cleanName(rawName ?? "");
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const contact = rest.join(",").trim();
    out.push({ name, contact: contact || null });
  }
  return out;
}
