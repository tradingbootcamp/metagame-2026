// The Friday-night public event. The name is final: the Night Market, as in
// 2025 (Libi, Oct 27; the proposed "MetaGame Night" rename was dropped).
// Every rulebook mention reads it from here; §5 sets its last word as tiles.
export const NIGHT_NAME = "Night Market";

export type Chapter = {
  num?: number;
  /** The section's anchor, kept from the one-pager so old links still land. */
  id: string;
  title: string;
  /** The header nav's label. */
  short: string;
  /** Plain words beside the title. */
  aka: string;
};

// The home page as the game's rulebook, in page order.
export const CHAPTERS = {
  object: {
    num: 1,
    id: "about",
    title: "Object of the game",
    short: "Object",
    aka: "What Metagame is",
  },
  components: {
    num: 2,
    id: "highlights",
    title: "Components",
    short: "Components",
    aka: "What's in the box",
  },
  setup: {
    num: 3,
    id: "venue",
    title: "Setup",
    short: "Setup",
    aka: "Getting there and staying over",
  },
  players: {
    num: 4,
    id: "speakers",
    title: "Players",
    short: "Players",
    aka: "Speakers and session hosts",
  },
  expansions: {
    num: 5,
    id: "megagame",
    title: "Expansions",
    short: "Expansions",
    aka: `${NIGHT_NAME} and the Megagame`,
  },
  special: {
    num: 6,
    id: "faq",
    title: "Special rules",
    short: "Special rules",
    aka: "FAQ",
  },
  join: {
    num: 7,
    id: "tickets",
    title: "Join the game",
    short: "Join",
    aka: "Tickets",
  },
} satisfies Record<string, Chapter>;

export const CREDITS: Chapter = {
  id: "sponsors",
  title: "Credits",
  short: "Credits",
  aka: "Our sponsors, with gratitude",
};

// /sessions: every 2026 session so far, one chapter per status.
export const SESSIONS_CHAPTERS = {
  confirmed: {
    num: 1,
    id: "confirmed",
    title: "Confirmed",
    short: "Confirmed",
    aka: "On the program",
  },
  review: {
    num: 2,
    id: "in-review",
    title: "In review",
    short: "In review",
    aka: "Submitted, not confirmed yet",
  },
  unconference: {
    num: 3,
    id: "unconference",
    title: "Unconference",
    short: "Unconference",
    aka: "On the unconference schedule",
  },
} satisfies Record<string, Chapter>;

// /last-year as the rulebook's 2025 edition, in page order.
export const LAST_YEAR_CHAPTERS = {
  report: {
    num: 1,
    id: "match-report",
    title: "Match report",
    short: "Match report",
    aka: "How the 2025 megagame played",
  },
  replay: {
    num: 2,
    id: "replay",
    title: "Instant replay",
    short: "Replay",
    aka: "The weekend, fifteen minutes at a time",
  },
  trivia: {
    num: 3,
    id: "trivia",
    title: "Trivia round",
    short: "Trivia",
    aka: "Talk, workshop or game?",
  },
} satisfies Record<string, Chapter>;
