// Fills a schema-only dev branch with deterministic fake data, so previews
// never hold real accounts, sessions, or purchases. Everything upserts on
// fixed ids, so re-running is a no-op; rows removed from this file linger
// until the branch is reset. Refuses to run without --yes or against the
// production endpoint.
//
// A fresh dev branch:
//   neonctl branches create --project-id noisy-rice-01985901 \
//     --name dev --parent main --schema-only
//   DATABASE_URL=<its connection string> pnpm db:seed --yes && pnpm db:migrate
//
// Seed before migrating: a schema-only branch copies the tables but not the
// migration ledger, so db:migrate would replay 0000 and fail. When the ledger
// is empty this script fills it from drizzle/meta/_journal.json, which is right
// only when the checkout's migrations match what the parent branch has applied
// (run it from origin/main).
//
// Every seeded account signs in with the password "metagame":
//   admin@metagame.games      role admin (superuser bypass)
//   grants@metagame.games     per-user grants: tickets.view, links.manage
//   host@metagame.games       "Schedule team" role; hosts three sessions
//   attendee@metagame.games   claimed ticket, RSVPs, bookmarks
//   newcomer@metagame.games   unclaimed purchase under their email
//   banned@metagame.games     banned
//
// Not seeded: promo codes and tracking links live in Stripe and Airtable,
// not Postgres; api keys and sessions are minted by signing in.
import { createHash, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

for (const file of [
  ".env.local",
  ".vercel/.env.production.local",
  ".vercel/.env.preview.local",
]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file absent
  }
}

// Compute endpoint of the Neon `main` branch (prod).
const PROD_ENDPOINT = "ep-crimson-sky-b8tcqhxv";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[db:seed] DATABASE_URL not set — nothing to seed");
  process.exit(0);
}
const host = new URL(url).hostname;
if (host.startsWith(PROD_ENDPOINT)) {
  console.error(`[db:seed] refusing to seed the production endpoint (${host})`);
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error(
    `[db:seed] would seed ${host}; pass --yes to confirm (this writes rows)`,
  );
  process.exit(1);
}

const sql = neon(url);

// Matches better-auth's scrypt settings (src/lib/auth.ts leaves the default
// hasher). Fixed salt keeps the hash, and so the upsert, deterministic.
const PASSWORD = "metagame";
const SALT = "5eed5eed5eed5eed5eed5eed5eed5eed";
const passwordHash =
  SALT +
  ":" +
  scryptSync(PASSWORD.normalize("NFKC"), SALT, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  }).toString("hex");

// Same derivation as src/lib/ticket-code.ts.
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function ticketCode(paymentId) {
  const hash = createHash("sha256").update(paymentId).digest();
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[hash[i] % 32];
  return code;
}

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Pacific time on the event weekend.
const at = (day, hour) =>
  new Date(Date.UTC(2026, 10, day, hour + 8)).toISOString();

/** Insert rows, updating every non-key column on conflict. */
async function upsert(table, keys, rows) {
  for (const row of rows) {
    const cols = Object.keys(row);
    const update = cols
      .filter((c) => !keys.includes(c))
      .map((c) => `"${c}" = excluded."${c}"`);
    await sql.query(
      `insert into "${table}" (${cols.map((c) => `"${c}"`).join(", ")})
       values (${cols.map((_, i) => `$${i + 1}`).join(", ")})
       on conflict (${keys.map((k) => `"${k}"`).join(", ")})
       ${update.length ? `do update set ${update.join(", ")}` : "do nothing"}`,
      Object.values(row),
    );
  }
  return rows.length;
}

async function seedMigrationLedger() {
  const [{ n }] = await sql.query(
    "select count(*)::int as n from drizzle.__drizzle_migrations",
  );
  if (n > 0) return 0;
  const { entries } = JSON.parse(readFileSync("drizzle/meta/_journal.json"));
  for (const { tag, when } of entries) {
    const hash = createHash("sha256")
      .update(readFileSync(`drizzle/${tag}.sql`))
      .digest("hex");
    await sql.query(
      "insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)",
      [hash, when],
    );
  }
  return entries.length;
}

const users = {
  admin: { id: "seed-admin", name: "Seed Admin", role: "admin" },
  grants: { id: "seed-grants", name: "Seed Grants" },
  host: { id: "seed-host", name: "Seed Host" },
  attendee: { id: "seed-attendee", name: "Seed Attendee" },
  newcomer: { id: "seed-newcomer", name: "Seed Newcomer" },
  banned: {
    id: "seed-banned",
    name: "Seed Banned",
    banned: true,
    ban_reason: "seed data",
  },
};

const FIRST =
  "Ada Bo Cy Dee Eli Fay Gus Hal Ivy Jo Kit Lu Max Nia Oz Pia Quin Rae Sol Tess".split(
    " ",
  );
const LAST =
  "Ash Birch Cole Dale Eyre Frost Gale Hart Idle Jade Kerr Lane Moss Nash Oakes Penn Quill Reed Snow Tate Vale Webb Yates Zorn Finch".split(
    " ",
  );
// i % 20 and 7i % 25 only coincide every 100, so the names are distinct.
const crowd = Array.from({ length: 100 }, (_, i) => ({
  id: `seed-att-${String(i + 1).padStart(3, "0")}`,
  name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
  i,
}));
const everyone = [...Object.values(users), ...crowd];

const locations = {
  hall: { id: uuid(1), name: "Seed Hall", capacity: 80, display_order: 1 },
  lounge: { id: uuid(2), name: "Seed Lounge", capacity: 20, display_order: 2 },
  garden: { id: uuid(3), name: "Seed Garden", capacity: 40, display_order: 3 },
};

const sessions = [
  {
    id: uuid(101),
    slug: "seed-opening-keynote",
    title: "Opening Keynote",
    description: "How to lose gracefully at everything.",
    category: "talk",
    starts_at: at(6, 10),
    ends_at: at(6, 11),
    location_id: locations.hall.id,
    max_capacity: 80,
    ages: "all",
    status: "published",
    phase: "ready",
    verdict: "confirmed",
  },
  {
    id: uuid(102),
    slug: "seed-puzzle-workshop",
    title: "Puzzle Construction Workshop",
    description: "Bring a pencil.",
    category: "workshop",
    starts_at: at(6, 13),
    ends_at: at(6, 15),
    location_id: locations.lounge.id,
    max_capacity: 20,
    min_capacity: 4,
    ages: "all",
    status: "published",
    needs: "Whiteboard, printer access",
    phase: "ready",
    verdict: "confirmed",
  },
  {
    id: uuid(103),
    slug: "seed-giant-chess",
    title: "Giant Chess",
    description: "Outdoor chess on the big board.",
    category: "game",
    starts_at: at(7, 14),
    ends_at: at(7, 16),
    location_id: locations.garden.id,
    max_capacity: 32,
    ages: "all",
    status: "published",
    phase: "ready",
    verdict: "confirmed",
    megagame_integration_level: "low_context_rewards",
  },
  {
    id: uuid(104),
    slug: "seed-treasure-hunt",
    title: "Treasure Hunt",
    description: "A hunt around campus for the under-12s.",
    category: "game",
    starts_at: at(8, 10),
    ends_at: at(8, 12),
    location_id: locations.garden.id,
    max_capacity: 24,
    ages: "kids",
    status: "published",
    phase: "ready",
    verdict: "confirmed",
  },
  {
    id: uuid(105),
    slug: "seed-unplaced-panel",
    title: "Unplaced Panel",
    description: "An RFP still in grading, with no slot yet.",
    category: "talk",
    status: "draft",
    airtable_rfp_record_id: "recSEED00000001",
    shepherd_user_id: users.admin.id,
    phase: "grading",
    verdict: "needs_follow_up",
    speaker_tier: "free_ticket",
    context: "Submitted via the RFP form.",
    requested_duration: "60 minutes",
    megagame_interest: "willing",
    marketing_consent: true,
    discord_status: "not_yet",
  },
  {
    id: uuid(106),
    slug: "seed-late-night-larp",
    title: "Late Night Larp",
    description: "Adults only; placed but not yet published.",
    category: "game",
    starts_at: at(7, 22),
    ends_at: at(8, 0),
    location_id: locations.hall.id,
    max_capacity: 30,
    ages: "adults",
    status: "draft",
    airtable_rfp_record_id: "recSEED00000002",
    shepherd_user_id: users.host.id,
    phase: "scheduling",
    verdict: "probably",
    speaker_tier: "no_comp",
    megagame_interest: "excited",
  },
];

const ticket = (payment_id, rest) => ({
  payment_id,
  ticket_code: ticketCode(payment_id),
  source: "stripe",
  status: "paid",
  test: false,
  tier: "Standard",
  amount_cents: 45000,
  coupon_code: null,
  purchaser_email: null,
  purchaser_name: null,
  owner_user_id: null,
  claimed_at: null,
  holder_user_id: null,
  ...rest,
});

const tickets = [
  ticket("pi_seed_paid_claimed", {
    purchaser_email: "attendee@metagame.games",
    purchaser_name: "Seed Attendee",
    owner_user_id: users.attendee.id,
    claimed_at: "2026-10-01T12:00:00Z",
  }),
  ticket("pi_seed_paid_unclaimed", {
    purchaser_email: "newcomer@metagame.games",
    purchaser_name: "Seed Newcomer",
  }),
  ticket("pi_seed_pending", {
    status: "pending",
    tier: "Day pass",
    amount_cents: 15000,
    purchaser_email: "pending@metagame.games",
  }),
  ticket("pi_seed_failed", {
    status: "failed",
    purchaser_email: "failed@metagame.games",
  }),
  ticket("on_seed_underpaid", {
    source: "opennode",
    status: "underpaid",
    amount_cents: 44000,
    purchaser_email: "underpaid@metagame.games",
  }),
  ticket("on_seed_paid", {
    source: "opennode",
    purchaser_email: "bitcoiner@metagame.games",
  }),
  ...[1, 2, 3].map((n) =>
    ticket(`pi_seed_pack:ticket:${n}`, {
      tier: "Family & Friends Pack",
      amount_cents: 40000,
      purchaser_email: "host@metagame.games",
      purchaser_name: "Seed Host",
      owner_user_id: n === 1 ? users.host.id : null,
      claimed_at: n === 1 ? "2026-10-02T12:00:00Z" : null,
      holder_user_id: n === 2 ? users.grants.id : null,
    }),
  ),
  ticket("admin:seed-comp", {
    source: "admin",
    amount_cents: 0,
    coupon_code: "SEEDCOMP",
    purchaser_email: "grants@metagame.games",
    owner_user_id: users.grants.id,
    claimed_at: "2026-10-03T12:00:00Z",
  }),
  ticket("pi_seed_test", {
    test: true,
    purchaser_email: "tester@metagame.games",
  }),
  ...crowd.map((u) =>
    ticket(`pi_seed_${u.id}`, {
      tier: u.i % 10 === 9 ? "Day pass" : "Standard",
      amount_cents: u.i % 10 === 9 ? 15000 : 45000,
      purchaser_email: `${u.id.replace("seed-", "")}@metagame.games`,
      purchaser_name: u.name,
      owner_user_id: u.id,
      claimed_at: new Date(Date.UTC(2026, 8, 1, 12, u.i * 11)).toISOString(),
    }),
  ),
];

// Crowd RSVPs: `going` until the session is full, then `waitlist`.
const crowdRsvps = [];
const fill = (n, pick, cap) => {
  let going = sessions.find((s) => s.id === uuid(n)).max_capacity - cap;
  for (const u of crowd.filter(pick)) {
    crowdRsvps.push({
      session_id: uuid(n),
      user_id: u.id,
      status: going-- > 0 ? "going" : "waitlist",
    });
  }
};
fill(101, (u) => u.i % 5 !== 0, 2);
fill(102, (u) => u.i % 7 === 0, 1);
fill(103, (u) => u.i % 3 === 0, 1);
fill(104, (u) => u.i % 10 === 0, 0);

const counts = {};

counts.ledger = await seedMigrationLedger();

counts.user = await upsert(
  "user",
  ["id"],
  everyone.map((u) => ({
    id: u.id,
    name: u.name,
    email: `${u.id.replace("seed-", "")}@metagame.games`,
    email_verified: true,
    role: u.role ?? "user",
    banned: u.banned ?? false,
    ban_reason: u.ban_reason ?? null,
  })),
);
counts.account = await upsert(
  "account",
  ["id"],
  everyone.map((u) => ({
    id: `${u.id}-credential`,
    account_id: u.id,
    provider_id: "credential",
    user_id: u.id,
    password: passwordHash,
  })),
);
counts.profiles = await upsert(
  "profiles",
  ["user_id"],
  everyone.map((u) => ({
    user_id: u.id,
    pronouns: u === users.host ? "they/them" : null,
    discord_handle: u === users.attendee ? "seed_attendee" : null,
    bio: u === users.host ? "Runs games. Seeded." : null,
    is_public: u === users.host || u.i % 3 === 0,
    is_adult: true,
  })),
);

// Attendee is the built-in role src/lib/permission-store.ts expects by name.
const roleRows = await Promise.all(
  [
    { name: "Attendee", permissions: ["schedule.rsvps"] },
    { name: "Schedule team", permissions: ["schedule.manage", "users.view"] },
  ].map(async (r) => {
    const [{ id }] = await sql.query(
      `insert into roles (name) values ($1)
       on conflict (name) do update set updated_at = now() returning id`,
      [r.name],
    );
    return { ...r, id };
  }),
);
counts.roles = roleRows.length;
counts.role_permissions = await upsert(
  "role_permissions",
  ["role_id", "permission"],
  roleRows.flatMap((r) =>
    r.permissions.map((permission) => ({ role_id: r.id, permission })),
  ),
);
counts.user_roles = await upsert(
  "user_roles",
  ["user_id", "role_id"],
  [{ user_id: users.host.id, role_id: roleRows[1].id }],
);
counts.user_permission_grants = await upsert(
  "user_permission_grants",
  ["user_id", "permission"],
  ["tickets.view", "links.manage"].map((permission) => ({
    user_id: users.grants.id,
    permission,
  })),
);

counts.tickets = await upsert("tickets", ["payment_id"], tickets);

counts.locations = await upsert(
  "locations",
  ["id"],
  Object.values(locations).map((l) => ({ ...l, show_in_schedule: true })),
);
counts.sessions = await upsert("sessions", ["id"], sessions);
counts.session_hosts = await upsert(
  "session_hosts",
  ["session_id", "position"],
  [
    { session_id: uuid(101), position: 0, user_id: users.host.id },
    { session_id: uuid(102), position: 0, user_id: users.host.id },
    { session_id: uuid(103), position: 0, user_id: users.host.id },
    { session_id: uuid(103), position: 1, user_id: users.grants.id },
    { session_id: uuid(104), position: 0, user_id: users.attendee.id },
    { session_id: uuid(105), position: 0, user_id: users.newcomer.id },
    { session_id: uuid(106), position: 0, user_id: users.grants.id },
  ],
);
counts.rsvps = await upsert(
  "rsvps",
  ["session_id", "user_id"],
  [
    { session_id: uuid(101), user_id: users.attendee.id, status: "going" },
    { session_id: uuid(101), user_id: users.newcomer.id, status: "going" },
    { session_id: uuid(102), user_id: users.attendee.id, status: "waitlist" },
    { session_id: uuid(102), user_id: users.grants.id, status: "going" },
    { session_id: uuid(103), user_id: users.attendee.id, status: "going" },
    ...crowdRsvps,
  ],
);
counts.bookmarks = await upsert(
  "bookmarks",
  ["session_id", "user_id"],
  [
    { session_id: uuid(104), user_id: users.attendee.id },
    { session_id: uuid(103), user_id: users.newcomer.id },
    ...crowd
      .filter((u) => u.i % 6 === 1)
      .map((u) => ({ session_id: uuid(103), user_id: u.id })),
    ...crowd
      .filter((u) => u.i % 9 === 2)
      .map((u) => ({ session_id: uuid(102), user_id: u.id })),
  ],
);

counts.session_grades = await upsert(
  "session_grades",
  ["id"],
  [
    {
      id: uuid(201),
      session_id: uuid(105),
      grader_user_id: users.admin.id,
      operational_ease: "good",
      host_competence: "good",
      fun: "best",
      verdict_recommendation: "probably",
      quality_notes: "Strong pitch, needs a slot.",
      topic_areas: "{puzzle_hunts,word_puzzles}",
      expected_crowd_size: 30,
      allow_dropins: "welcome",
      submitted_at: "2026-10-05T12:00:00Z",
    },
  ],
);
counts.session_grade_space_options = await upsert(
  "session_grade_space_options",
  ["grade_id", "location_id"],
  [{ grade_id: uuid(201), location_id: locations.lounge.id }],
);

for (const [table, n] of Object.entries(counts)) {
  console.log(`[db:seed] ${table}: ${n}`);
}
console.log(`[db:seed] done on ${host}`);
