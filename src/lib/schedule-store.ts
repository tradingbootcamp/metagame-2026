import { asc, eq, inArray, like } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  fromPacificWall,
  type ScheduleLocation,
  type ScheduleSession,
} from "./schedule";

const { locations, sessions, sessionHosts } = schema;

export type Schedule = {
  locations: ScheduleLocation[];
  sessions: ScheduleSession[];
};

export async function loadSchedule(): Promise<Schedule> {
  const db = getDb();
  const [locs, sess, hosts] = await Promise.all([
    db
      .select()
      .from(locations)
      .orderBy(asc(locations.displayOrder), asc(locations.name)),
    db
      .select()
      .from(sessions)
      .orderBy(asc(sessions.startsAt), asc(sessions.title)),
    db
      .select()
      .from(sessionHosts)
      .orderBy(asc(sessionHosts.sessionId), asc(sessionHosts.position)),
  ]);
  const hostsBySession = new Map<string, string[]>();
  for (const h of hosts) {
    hostsBySession.set(h.sessionId, [
      ...(hostsBySession.get(h.sessionId) ?? []),
      h.displayName,
    ]);
  }
  return {
    locations: locs.map((l) => ({
      id: l.id,
      name: l.name,
      capacity: l.capacity,
      campusLocation: l.campusLocation,
      displayOrder: l.displayOrder,
      showInSchedule: l.showInSchedule,
    })),
    sessions: sess.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      category: s.category,
      startsAt: s.startsAt?.toISOString() ?? null,
      endsAt: s.endsAt?.toISOString() ?? null,
      locationId: s.locationId,
      maxCapacity: s.maxCapacity,
      minCapacity: s.minCapacity,
      ages: s.ages,
      needs: s.needs,
      status: s.status,
      hosts: hostsBySession.get(s.id) ?? [],
    })),
  };
}

export type SessionInput = Omit<
  ScheduleSession,
  "id" | "startsAt" | "endsAt"
> & {
  id?: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** Inserts or, with an id, replaces the session and its host list. */
export async function upsertSession(input: SessionInput): Promise<string> {
  const db = getDb();
  const { id, hosts, ...row } = input;
  let sessionId: string;
  if (id) {
    const [updated] = await db
      .update(sessions)
      .set(row)
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id });
    if (!updated) throw new Error("That session no longer exists.");
    sessionId = updated.id;
  } else {
    const [inserted] = await db
      .insert(sessions)
      .values(row)
      .returning({ id: sessions.id });
    sessionId = inserted.id;
  }
  const remove = db
    .delete(sessionHosts)
    .where(eq(sessionHosts.sessionId, sessionId));
  if (hosts.length === 0) {
    await remove;
  } else {
    await db.batch([
      remove,
      db
        .insert(sessionHosts)
        .values(
          hosts.map((displayName, position) => ({
            sessionId,
            position,
            displayName,
          })),
        ),
    ]);
  }
  return sessionId;
}

export async function removeSession(id: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.id, id));
}

export type LocationInput = Omit<ScheduleLocation, "id"> & { id?: string };

export async function upsertLocation(input: LocationInput): Promise<string> {
  const db = getDb();
  const { id, ...row } = input;
  if (id) {
    const [updated] = await db
      .update(locations)
      .set(row)
      .where(eq(locations.id, id))
      .returning({ id: locations.id });
    if (!updated) throw new Error("That location no longer exists.");
    return updated.id;
  }
  const [inserted] = await db
    .insert(locations)
    .values(row)
    .returning({ id: locations.id });
  return inserted.id;
}

/** Sessions in the room keep their row; location_id goes null. */
export async function removeLocation(id: string): Promise<void> {
  await getDb().delete(locations).where(eq(locations.id, id));
}

// Database constraints read back as sentences. Drizzle wraps the driver error,
// so look at the cause too.
const CONSTRAINT_MESSAGES: Record<string, { field?: string; error: string }> = {
  sessions_slug_unique: {
    field: "slug",
    error: "Another session has that slug.",
  },
  sessions_ends_after_start: {
    field: "endsAt",
    error: "End must be after start.",
  },
  sessions_published_timed: {
    field: "status",
    error: "A published session needs a start and end time.",
  },
  sessions_max_capacity_positive: {
    field: "maxCapacity",
    error: "Max capacity must be at least 1.",
  },
  sessions_min_within_max: {
    field: "minCapacity",
    error: "Min capacity must be between 0 and the max.",
  },
  locations_capacity_positive: {
    field: "capacity",
    error: "Capacity must be at least 1.",
  },
};

export function explainDbError(err: unknown): {
  field?: string;
  error: string;
} {
  for (
    let e: unknown = err;
    e && typeof e === "object";
    e = (e as { cause?: unknown }).cause
  ) {
    const constraint = (e as { constraint?: unknown }).constraint;
    if (typeof constraint === "string" && CONSTRAINT_MESSAGES[constraint]) {
      return CONSTRAINT_MESSAGES[constraint];
    }
  }
  return { error: err instanceof Error ? err.message : String(err) };
}

// Sample data for an empty development database: the 2025 rooms and a
// weekend's worth of sessions across the three conference days. Slugs are
// prefixed so the set can be removed again without touching real rows.
export const SAMPLE_PREFIX = "sample-";

const SAMPLE_LOCATIONS = [
  {
    name: "Eigen Hall",
    capacity: 80,
    campusLocation: "Main building",
    displayOrder: 10,
  },
  {
    name: "The Clocktower",
    capacity: 30,
    campusLocation: "Upstairs",
    displayOrder: 20,
  },
  {
    name: "The Gardens",
    capacity: 40,
    campusLocation: "Outside",
    displayOrder: 30,
  },
  {
    name: "Playtesting Plaza",
    capacity: 25,
    campusLocation: "Courtyard",
    displayOrder: 40,
  },
];

type SampleSession = {
  title: string;
  category: ScheduleSession["category"];
  ages: ScheduleSession["ages"];
  room: string | null;
  day: "06" | "07" | "08";
  start: string;
  end: string;
  hosts: string[];
  maxCapacity?: number;
  status?: ScheduleSession["status"];
};

const SAMPLE_SESSIONS: SampleSession[] = [
  {
    title: "Opening ceremony",
    category: "other",
    ages: "all",
    room: "Eigen Hall",
    day: "06",
    start: "17:00",
    end: "17:45",
    hosts: ["Ricki Heicklen"],
    status: "published",
  },
  {
    title: "How to lose at everything",
    category: "talk",
    ages: "all",
    room: "Eigen Hall",
    day: "06",
    start: "18:00",
    end: "19:00",
    hosts: ["Ada Lovelace"],
    status: "published",
  },
  {
    title: "Build an escape room in 90 minutes",
    category: "workshop",
    ages: "adults",
    room: "The Clocktower",
    day: "06",
    start: "18:00",
    end: "19:30",
    hosts: ["Grace Hopper", "Alan Turing"],
    maxCapacity: 16,
    status: "published",
  },
  {
    title: "Giant chess",
    category: "game",
    ages: "kids",
    room: "The Gardens",
    day: "06",
    start: "18:30",
    end: "20:00",
    hosts: ["Isaac King"],
    status: "published",
  },
  {
    title: "Prediction markets 101",
    category: "talk",
    ages: "all",
    room: "Eigen Hall",
    day: "07",
    start: "10:00",
    end: "11:00",
    hosts: ["Robin Hanson"],
    status: "published",
  },
  {
    title: "Crossword construction",
    category: "workshop",
    ages: "all",
    room: "The Clocktower",
    day: "07",
    start: "10:00",
    end: "12:00",
    hosts: ["Will Shortz"],
    maxCapacity: 20,
    status: "published",
  },
  {
    title: "Human sudoku",
    category: "game",
    ages: "all",
    room: "The Gardens",
    day: "07",
    start: "11:00",
    end: "12:30",
    hosts: ["Simon Anthony"],
    maxCapacity: 36,
    status: "published",
  },
  {
    title: "Playtest: unreleased prototypes",
    category: "game",
    ages: "all",
    room: "Playtesting Plaza",
    day: "07",
    start: "13:00",
    end: "17:00",
    hosts: ["Elizabeth Hargrave"],
    status: "published",
  },
  {
    title: "The economics of board game design",
    category: "talk",
    ages: "all",
    room: "Eigen Hall",
    day: "07",
    start: "14:00",
    end: "15:00",
    hosts: ["Reiner Knizia"],
    status: "published",
  },
  {
    title: "LARP: the committee meeting",
    category: "game",
    ages: "adults",
    room: "The Clocktower",
    day: "07",
    start: "15:30",
    end: "18:00",
    hosts: ["Jason Morningstar"],
    maxCapacity: 12,
    status: "published",
  },
  {
    title: "Puzzle hunt wrap-up",
    category: "talk",
    ages: "all",
    room: "Eigen Hall",
    day: "08",
    start: "11:00",
    end: "12:00",
    hosts: ["Dan Katz"],
    status: "published",
  },
  {
    title: "Closing ceremony",
    category: "other",
    ages: "all",
    room: "Eigen Hall",
    day: "08",
    start: "16:00",
    end: "17:00",
    hosts: ["Ricki Heicklen", "Brian Smiley"],
    status: "published",
  },
  {
    title: "Megagame debrief (room TBD)",
    category: "other",
    ages: "all",
    room: null,
    day: "08",
    start: "13:00",
    end: "14:00",
    hosts: ["Jisk Kopczynski"],
    status: "draft",
  },
  {
    title: "Unplaced draft: speed Diplomacy",
    category: "game",
    ages: "adults",
    room: null,
    day: "08",
    start: "",
    end: "",
    hosts: ["Someone"],
    status: "draft",
  },
];

export async function insertSample(): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(like(sessions.slug, `${SAMPLE_PREFIX}%`))
    .limit(1);
  if (existing) return;

  const have = await db.select().from(locations);
  const roomId = new Map(have.map((l) => [l.name, l.id]));
  const missing = SAMPLE_LOCATIONS.filter((l) => !roomId.has(l.name));
  if (missing.length > 0) {
    const made = await db
      .insert(locations)
      .values(missing.map((l) => ({ ...l, showInSchedule: true })))
      .returning({ id: locations.id, name: locations.name });
    for (const l of made) roomId.set(l.name, l.id);
  }

  for (const s of SAMPLE_SESSIONS) {
    const slug = `${SAMPLE_PREFIX}${s.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;
    const [row] = await db
      .insert(sessions)
      .values({
        slug,
        title: s.title,
        description: `Sample session. ${s.title} is here so the grid has something in it; edit or delete freely.`,
        category: s.category,
        ages: s.ages,
        startsAt: s.start
          ? fromPacificWall(`2026-11-${s.day}T${s.start}`)
          : null,
        endsAt: s.end ? fromPacificWall(`2026-11-${s.day}T${s.end}`) : null,
        locationId: s.room ? (roomId.get(s.room) ?? null) : null,
        maxCapacity: s.maxCapacity ?? null,
        status: s.status ?? "draft",
      })
      .returning({ id: sessions.id });
    await db
      .insert(sessionHosts)
      .values(
        s.hosts.map((displayName, position) => ({
          sessionId: row.id,
          position,
          displayName,
        })),
      );
  }
}

/** Removes the sample sessions, then any sample room nothing else uses. */
export async function removeSample(): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(like(sessions.slug, `${SAMPLE_PREFIX}%`));
  const rooms = await db
    .select({ id: locations.id })
    .from(locations)
    .where(
      inArray(
        locations.name,
        SAMPLE_LOCATIONS.map((l) => l.name),
      ),
    );
  if (rooms.length === 0) return;
  const used = new Set(
    (
      await db
        .selectDistinct({ id: sessions.locationId })
        .from(sessions)
        .where(
          inArray(
            sessions.locationId,
            rooms.map((r) => r.id),
          ),
        )
    ).map((r) => r.id),
  );
  const unused = rooms.map((r) => r.id).filter((id) => !used.has(id));
  if (unused.length > 0) {
    await db.delete(locations).where(inArray(locations.id, unused));
  }
}
