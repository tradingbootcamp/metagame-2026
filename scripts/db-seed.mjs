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
const at = (day, hour, minutes = 0) =>
  new Date(Date.UTC(2026, 10, day, hour + 8, minutes)).toISOString();

// Array params as a literal, so they survive any driver's serialisation.
const pgArray = (xs) =>
  `{${xs.map((x) => `"${x.replace(/["\\]/g, "\\$&")}"`).join(",")}}`;

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

// rsvps has a BEFORE INSERT capacity trigger that fires ahead of conflict
// resolution, so a plain upsert fails on a full session once rows exist.
async function upsertRsvps(rows) {
  for (const { session_id, user_id, status } of rows) {
    await sql.query(
      `insert into rsvps (session_id, user_id, status)
       select $1::uuid, $2::text, $3::rsvp_status
       where not exists (
         select 1 from rsvps where session_id = $1 and user_id = $2
       )`,
      [session_id, user_id, status],
    );
    await sql.query(
      `update rsvps set status = $3
       where session_id = $1 and user_id = $2 and status <> $3`,
      [session_id, user_id, status],
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
  `Ada Bashir Chiara Dmitri Esperanza Farid Greta Hiro Imani Jules Kalinda
   Leopold Maeve Nikolai Oona Priya Quentin Rosalind Soren Tamsin Umar Vesna
   Wendell Xiomara Yusuf Zelda Anouk Benedikt Cosima Desmond Eilidh Fergus
   Giulia Hamza Ingrid Jericho Kenji Liesl Marisol Nadia Olamide Pilar Quinlan
   Rafael Sunniva Tobias Ulla Viggo Wren Xavier Yara Zoltan Amara Bruno Celeste
   Dagny Emeka Fenna Gideon Halima Isidore Jolanta Kwame Lorcan Mireille Nestor
   Ottoline Paavo Qadir Rhiannon Sigrid Thaddeus Ulysses Valentina Wilhelm
   Xenia Yevgenia Zachariah Aurelio Beatrix Caspian Delphine Ezra Freya Gustavo
   Henrietta Idris Jasmine Kofi Lucinda Matthias Noor Octavia Percival Quilla
   Ravi Saoirse Tendai Ulrike Vivienne`.split(/\s+/);
const LAST =
  `Abernathy Baptiste Castellanos Delacroix Eriksen Fairweather Galloway
   Hashimoto Ibarra Jankowski Kowalczyk Lindqvist Marchetti Nakamura Okonkwo
   Pemberton Quiroga Rasmussen Sandoval Thackeray Underwood Villanueva
   Whitcombe Xiang Yamamoto Zielinski Ashworth Brannigan Cavendish Dubois
   Ellsworth Fitzgerald Grimaldi Holloway Ishikawa Jorgensen Kavanagh Lombardi
   Mbeki Nightingale Oyelaran Petrova Quennell Radcliffe Sorensen Takahashi
   Ueda Vasquez Winterbourne Xu Yilmaz Zamora Achterberg Bergstrom Cordeiro
   Dalgaard Esposito Ferreira Gutierrez Haddad Iyer Jansen Kristiansen Larsson
   Mendoza Novak Olofsson Pascal Quintero Rivera Schreiber Tanaka Uribe Varga
   Wakefield Xenakis Yoshida Zuniga Adeyemi Blackwood Chaudhary Dunmore
   Engelbrecht Falk Goldschmidt Havili Ivanova Joshi Kaur Leclerc Maalouf Nwosu
   Ortega Pinheiro Qureshi Rutherford Sato Tremblay Ulloa Vance`.split(/\s+/);
if (FIRST.length !== 100 || LAST.length !== 100) {
  throw new Error(`name lists: ${FIRST.length} first, ${LAST.length} last`);
}

// The crowd, in the mix the invite flow produces: most signed in and bought
// a ticket; some signed in and never bought; some were invited (as hosts or
// team) and never signed in; some bought under an email with no account yet.
const KINDS = [
  "attendee",
  "attendee",
  "attendee",
  "attendee",
  "attendee",
  "attendee",
  "member",
  "member",
  "invited",
  "buyer",
];
const crowd = Array.from({ length: 100 }, (_, i) => {
  const first = FIRST[i];
  const last = LAST[(i * 37) % 100];
  const kind = KINDS[i % 10];
  return {
    id: `seed-${first.toLowerCase()}-${last.toLowerCase()}`,
    name: `${first} ${last}`,
    email: `${first}.${last}@metagame.games`.toLowerCase(),
    kind,
    verified: kind === "attendee" || kind === "member",
    i,
  };
});
const invited = crowd.filter((u) => u.kind === "invited");
const everyone = [
  ...Object.values(users).map((u) => ({
    ...u,
    email: `${u.id.replace("seed-", "")}@metagame.games`,
    verified: true,
  })),
  ...crowd,
];

const locations = {
  hall: { id: uuid(1), name: "Seed Hall", capacity: 80, display_order: 1 },
  lounge: { id: uuid(2), name: "Seed Lounge", capacity: 20, display_order: 2 },
  garden: { id: uuid(3), name: "Seed Garden", capacity: 40, display_order: 3 },
  study: { id: uuid(4), name: "Seed Study", capacity: 12, display_order: 4 },
  dome: { id: uuid(5), name: "Seed Dome", capacity: 60, display_order: 5 },
  rooftop: {
    id: uuid(6),
    name: "Seed Rooftop",
    capacity: 25,
    display_order: 6,
  },
};

// The published weekend (Fri Nov 6 – Sun Nov 8), on top of the hand-made
// sessions below: [id, day, hour, minutes, room, category, title, blurb, ages, cap, extra].
const program = [
  [
    107,
    6,
    9,
    60,
    "dome",
    "other",
    "Registration & Breakfast Games",
    "Badges, pastries, and a 500-piece jigsaw race.",
    "all",
    60,
  ],
  [
    108,
    6,
    11,
    90,
    "lounge",
    "workshop",
    "Build a Prediction Market in an Hour",
    "Spreadsheets, bad priors, worse calibration.",
    "adults",
    20,
  ],
  [
    109,
    6,
    11,
    120,
    "garden",
    "game",
    "Capture the Flag: Bayesian Edition",
    "Two teams, one flag, priors updated on the fly.",
    "all",
    40,
    { megagame_integration_level: "low_context_rewards" },
  ],
  [
    110,
    6,
    13,
    60,
    "hall",
    "talk",
    "The History of Cheating at Cards",
    "From marked decks to shuffle tracking.",
    "all",
    80,
  ],
  [
    111,
    6,
    14,
    120,
    "study",
    "workshop",
    "Cryptic Crosswords for the Terrified",
    "Twelve clues, zero judgement.",
    "all",
    12,
    { min_capacity: 3 },
  ],
  [
    112,
    6,
    15,
    120,
    "dome",
    "game",
    "Diplomacy Speed Round",
    "Seven players, fifteen-minute turns, no friendships.",
    "adults",
    42,
  ],
  [
    113,
    6,
    16,
    60,
    "rooftop",
    "other",
    "Sunset Tea & Unconference Pitches",
    "Pitch a Sunday session in sixty seconds.",
    "all",
    25,
  ],
  [
    114,
    6,
    19,
    180,
    "hall",
    "game",
    "Megagame Briefing: The Orchard Accords",
    "Faction leads, read your sealed envelopes.",
    "all",
    80,
    { megagame_integration_level: "deep" },
  ],
  [
    115,
    6,
    21,
    120,
    "lounge",
    "game",
    "Werewolf After Dark",
    "The classic, with a moderator who holds grudges.",
    "adults",
    20,
  ],
  [
    116,
    7,
    8,
    60,
    "garden",
    "other",
    "Morning Run: Fog of War",
    "A 5k where the route is revealed one checkpoint at a time.",
    "all",
    30,
  ],
  [
    117,
    7,
    10,
    90,
    "hall",
    "talk",
    "Why Your Board Game Prototype Is Boring",
    "A design critique panel, by request only.",
    "all",
    80,
  ],
  [
    118,
    7,
    10,
    120,
    "dome",
    "game",
    "Escape Room: The Librarian's Lament",
    "Two rooms, one key, forty minutes per team.",
    "all",
    16,
    { min_capacity: 4, needs: "Padlocks, a red herring" },
  ],
  [
    119,
    7,
    10,
    60,
    "study",
    "workshop",
    "Teaching Kids Go",
    "Nine-by-nine boards, no stones thrown.",
    "kids",
    12,
  ],
  [
    120,
    7,
    12,
    60,
    "rooftop",
    "other",
    "Lunch: Blind Taste Test Tournament",
    "Rank the hot sauces. Then rank your rankings.",
    "all",
    25,
  ],
  [
    121,
    7,
    13,
    120,
    "lounge",
    "talk",
    "Mechanism Design for Potlucks",
    "How to get people to bring the dish you want.",
    "all",
    20,
  ],
  [
    122,
    7,
    13,
    180,
    "hall",
    "game",
    "Megagame: The Orchard Accords, Turns 1–3",
    "Trade, scheme, and watch the orchard map change.",
    "all",
    80,
    { megagame_integration_level: "deep" },
  ],
  [
    123,
    7,
    16,
    60,
    "dome",
    "talk",
    "Lightning Talks: Things I Was Wrong About",
    "Five minutes each, no slides allowed.",
    "all",
    60,
  ],
  [
    124,
    7,
    17,
    60,
    "study",
    "workshop",
    "Shuffle Tracking Lab",
    "Hands-on follow-up to the cheating talk; bring a deck.",
    "adults",
    12,
  ],
  [
    125,
    7,
    20,
    120,
    "dome",
    "game",
    "Pub Quiz: Metagame Edition",
    "Rounds on game theory, campus trivia, and each other.",
    "adults",
    60,
  ],
  [
    126,
    7,
    20,
    120,
    "garden",
    "game",
    "Night Puzzle Hunt",
    "Headlamps provided; answers are not.",
    "all",
    40,
    { megagame_integration_level: "puzzle_and_rewards" },
  ],
  [
    127,
    8,
    9,
    60,
    "rooftop",
    "other",
    "Puzzle Hunt Debrief",
    "What the setters meant, what you did instead.",
    "all",
    25,
  ],
  [
    128,
    8,
    10,
    120,
    "hall",
    "game",
    "Megagame: The Orchard Accords, Finale",
    "The envelopes are opened. Someone owns the orchard.",
    "all",
    80,
    { megagame_integration_level: "deep" },
  ],
  [
    129,
    8,
    11,
    60,
    "study",
    "workshop",
    "Origami Dice",
    "Fold a d6; a d20 for the brave.",
    "kids",
    12,
  ],
  [
    130,
    8,
    12,
    60,
    "lounge",
    "talk",
    "Calibration Game Results",
    "Who guessed best all weekend, and by how much.",
    "all",
    20,
  ],
  [
    131,
    8,
    13,
    120,
    "dome",
    "game",
    "Unconference Block",
    "Whatever got pitched on Friday.",
    "all",
    60,
    { verdict: "unconference_schedule" },
  ],
  [
    132,
    8,
    14,
    60,
    "garden",
    "game",
    "Kids vs Grownups Relay",
    "A relay. The kids usually win.",
    "all",
    40,
  ],
  [
    133,
    8,
    15,
    60,
    "hall",
    "talk",
    "Closing Ceremony & Awards",
    "Prizes, confessions, and the last hot sauce.",
    "all",
    80,
  ],
  [
    134,
    8,
    16,
    120,
    "garden",
    "other",
    "Teardown & Pickup Soccer",
    "Fold a chair, kick a ball.",
    "all",
    40,
  ],
].map(
  ([
    n,
    day,
    hour,
    minutes,
    room,
    category,
    title,
    description,
    ages,
    cap,
    extra,
  ]) => ({
    id: uuid(n),
    slug: `seed-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`,
    title,
    description,
    category,
    starts_at: at(day, hour),
    ends_at: at(day, hour, minutes),
    location_id: locations[room].id,
    max_capacity: cap,
    ages,
    status: "published",
    phase: "ready",
    verdict: "confirmed",
    ...extra,
  }),
);

// Proposals still in the pipeline, each at a different phase.
const pipeline = [
  [
    135,
    "Hexcrawl Design Clinic",
    "workshop",
    "deciding",
    "probably",
    "free_ticket",
    "willing",
  ],
  [
    136,
    "Timeshare Pitch (Interactive)",
    "other",
    "declined",
    "rejected",
    "no_comp",
    "not_a_fit",
  ],
  [
    137,
    "Sealed-Bid Auction Night",
    "game",
    "notifying",
    "confirmed",
    "free_ticket_flights",
    "excited",
  ],
  [
    138,
    "Mahjong for Beginners",
    "game",
    "shepherding",
    "probably",
    "no_comp",
    "neutral",
  ],
].map(
  ([n, title, category, phase, verdict, speaker_tier, megagame_interest]) => ({
    id: uuid(n),
    slug: `seed-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`,
    title,
    description: `Proposal #${n}; ${phase}.`,
    category,
    status: "draft",
    airtable_rfp_record_id: `recSEED${String(n).padStart(8, "0")}`,
    shepherd_user_id: [users.admin, invited[0], users.grants, invited[1]][n % 4]
      .id,
    phase,
    verdict,
    speaker_tier,
    megagame_interest,
    requested_duration: "90 minutes",
    marketing_consent: true,
    discord_status: "needs_role",
  }),
);

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
  ...program,
  ...pipeline,
];

// Crowd members host the generated sessions. Every third session also has a
// co-host who was added by the schedule tool and never signed in.
const crowdHosts = [...program, ...pipeline].flatMap((s, k) => [
  { session_id: s.id, position: 0, user_id: crowd[(k * 13) % 100].id },
  ...(k % 3 === 0
    ? [
        {
          session_id: s.id,
          position: 1,
          user_id: invited[k % invited.length].id,
        },
      ]
    : []),
]);

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
  ...crowd
    .filter((u) => u.kind === "attendee" || u.kind === "buyer")
    .map((u) =>
      ticket(`pi_seed_${u.id}`, {
        tier: u.i % 10 === 4 ? "Day pass" : "Standard",
        amount_cents: u.i % 10 === 4 ? 15000 : 45000,
        purchaser_email: u.email,
        purchaser_name: u.name,
        owner_user_id: u.kind === "attendee" ? u.id : null,
        claimed_at:
          u.kind === "attendee"
            ? new Date(Date.UTC(2026, 8, 1, 12, u.i * 11)).toISOString()
            : null,
      }),
    ),
];

// Crowd RSVPs: `going` until the session is full, then `waitlist`.
const crowdRsvps = [];
const fill = (n, pick, cap) => {
  let going = sessions.find((s) => s.id === uuid(n)).max_capacity - cap;
  for (const u of crowd.filter((u) => u.verified && pick(u))) {
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
// Interest varies by session: between a tenth and half of the crowd.
program.forEach((s, k) =>
  fill(Number(s.id.slice(-3)), (u) => (u.i * 7 + k) % 11 < 1 + (k % 5), 0),
);

const counts = {};

counts.ledger = await seedMigrationLedger();

// Seed rows the script no longer produces, so a changed script converges.
// Child rows of seed users and seed sessions are simply rebuilt.
for (const [table, col] of [
  ["rsvps", "user_id"],
  ["bookmarks", "user_id"],
  ["user_roles", "user_id"],
  ["user_permission_grants", "user_id"],
]) {
  await sql.query(`delete from "${table}" where "${col}" like 'seed-%'`);
}
await sql.query(
  `delete from session_hosts where session_id::text like '00000000-0000-4000-8000-%'`,
);
await sql.query(
  `delete from account where provider_id = 'credential'
   and user_id like 'seed-%' and not (user_id = any($1::text[]))`,
  [pgArray(everyone.filter((u) => u.verified).map((u) => u.id))],
);
await sql.query(
  `delete from tickets where payment_id like '%seed%'
   and not (payment_id = any($1::text[]))`,
  [pgArray(tickets.map((t) => t.payment_id))],
);
await sql.query(
  `delete from "user" where id like 'seed-%' and not (id = any($1::text[]))`,
  [pgArray(everyone.map((u) => u.id))],
);

counts.user = await upsert(
  "user",
  ["id"],
  everyone.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    email_verified: u.verified,
    role: u.role ?? "user",
    banned: u.banned ?? false,
    ban_reason: u.ban_reason ?? null,
  })),
);
counts.account = await upsert(
  "account",
  ["id"],
  everyone
    .filter((u) => u.verified)
    .map((u) => ({
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
    is_public: u === users.host || (u.verified && u.i % 3 === 0),
    is_adult: true,
  })),
);

// Attendee is the built-in role src/lib/permission-store.ts expects by name.
const roleRows = await Promise.all(
  [
    { name: "Attendee", permissions: ["schedule.rsvps"] },
    { name: "Schedule team", permissions: ["schedule.manage", "users.view"] },
    {
      name: "Speaker committee",
      permissions: ["submissions.grade", "schedule.preview"],
    },
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
  [
    { user_id: users.host.id, role_id: roleRows[1].id },
    ...[invited[0], invited[1], crowd[2]].map((u) => ({
      user_id: u.id,
      role_id: roleRows[2].id,
    })),
  ],
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
    ...crowdHosts,
  ],
);
counts.rsvps = await upsertRsvps([
  { session_id: uuid(101), user_id: users.attendee.id, status: "going" },
  { session_id: uuid(101), user_id: users.newcomer.id, status: "going" },
  { session_id: uuid(102), user_id: users.attendee.id, status: "waitlist" },
  { session_id: uuid(102), user_id: users.grants.id, status: "going" },
  { session_id: uuid(103), user_id: users.attendee.id, status: "going" },
  ...crowdRsvps,
]);
counts.bookmarks = await upsert(
  "bookmarks",
  ["session_id", "user_id"],
  [
    { session_id: uuid(104), user_id: users.attendee.id },
    { session_id: uuid(103), user_id: users.newcomer.id },
    ...crowd
      .filter((u) => u.verified && u.i % 6 === 1)
      .map((u) => ({ session_id: uuid(103), user_id: u.id })),
    ...crowd
      .filter((u) => u.verified && u.i % 9 === 2)
      .map((u) => ({ session_id: uuid(102), user_id: u.id })),
    ...program.flatMap((s, k) =>
      crowd
        .filter((u) => u.verified && (u.i * 5 + k) % 13 === 0)
        .map((u) => ({ session_id: s.id, user_id: u.id })),
    ),
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
