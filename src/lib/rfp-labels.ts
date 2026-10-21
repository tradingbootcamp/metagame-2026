import type {
  discordStatus,
  megagameInterest,
  potentialPanel,
  rubricGrade,
  sessionDropins,
  sessionPhase,
  sessionVerdict,
  shepherdMatch,
  speakerTier,
  topicArea,
} from "@/db/schema";

// Airtable RFP Submissions option labels for each enum value. Plain data with
// type-only imports so one-off node scripts can load this file directly.

type Labels<E extends { enumValues: readonly string[] }> = Record<
  E["enumValues"][number],
  string
>;

export const PHASE_LABELS: Labels<typeof sessionPhase> = {
  grading: "Grading",
  deciding: "Committee decision",
  notifying: "Email speaker with verdict",
  shepherding: "Shepherding",
  scheduling: "Add to schedule",
  ready: "Ready",
  declined: "Declined",
};

/** Airtable "Next steps" options, each mapped to the phase that replaces it. */
export const NEXT_STEPS_PHASE: Record<
  string,
  (typeof sessionPhase)["enumValues"][number]
> = {
  "0. Assign grader": "grading",
  "1. Grade": "grading",
  "2. Committee decision": "deciding",
  "3. Email speaker with verdict": "notifying",
  "4. Assign shepherd": "shepherding",
  "5. Shepherd meeting": "shepherding",
  "6. Add to schedule": "scheduling",
  "7. None! We're good :) ": "ready",
  "N/A": "declined",
};

export const VERDICT_LABELS: Labels<typeof sessionVerdict> = {
  confirmed: "Confirmed",
  probably: "Probably",
  needs_follow_up: "needs follow up",
  unconference_schedule: "Unconference schedule",
  unlikely: "Unlikely",
  rejected: "Rejected",
  na: "N/A",
};

/** "Grader Verdict recomendation" words two options differently from Verdict. */
export const GRADER_VERDICT_LABELS: Labels<typeof sessionVerdict> = {
  ...VERDICT_LABELS,
  confirmed: "Confirm",
  rejected: "Reject",
};

export const SPEAKER_TIER_LABELS: Labels<typeof speakerTier> = {
  free_ticket_flights_housing: "Free ticket + flights + housing",
  free_ticket_flights: "Free ticket + flights",
  free_ticket: "Free ticket",
  no_comp: "They can add it to the schedule if they want, but no ticket comp",
};

export const MEGAGAME_INTEREST_LABELS: Labels<typeof megagameInterest> = {
  not_a_fit: "Not the right fit",
  neutral: "Neutral",
  willing: "Willing",
  excited: "Actively excited",
  full_proposal: "Submitting a full Megagame proposal",
};

export const DROPINS_LABELS: Labels<typeof sessionDropins> = {
  welcome: "Dropins welcome",
  full_block: "Need to attend the entire block",
  spectate: "Some players need to attend full block, but dropins can spectate",
  other: "Other",
};

export const DISCORD_STATUS_LABELS: Labels<typeof discordStatus> = {
  not_yet: "Not yet",
  needs_role: "Needs role",
  session_host: "@session host",
  refused: "refused",
};

export const RUBRIC_GRADE_LABELS: Labels<typeof rubricGrade> = {
  best: "Best",
  good: "Good",
  meh: "Meh",
  bad: "Bad",
  unclear: "Unclear",
};

export const SHEPHERD_MATCH_LABELS: Labels<typeof shepherdMatch> = {
  positive:
    "Positive: I would be a good Shepherd for this spekaer, and would be excited to do so",
  neutral: "Neutral: I'm willing and able to be their Shepherd if needed",
  negative:
    "Negative: I would be the wrong fit for Shepherd for this speaker/session",
  other: "Other or N/A",
};

export const TOPIC_AREA_LABELS: Labels<typeof topicArea> = {
  board_games: "Board games",
  card_games: "Card games",
  ttrpgs: "TTRPGs",
  larps: "LARPs",
  word_puzzles: "Word puzzles (e.g. crosswords)",
  number_puzzles: "Number puzzles (e.g. Sudoku)",
  puzzle_hunts: "Puzzle hunts",
  escape_rooms: "Escape Rooms",
  video_games: "Video games",
  physical_games: "Physical games",
  party_game: "Party Game",
  immersive_experience: "Immersive experience",
};

export const POTENTIAL_PANEL_LABELS: Labels<typeof potentialPanel> = {
  professional_gm: "Professional GM",
  game_publishers: "Game publishers, or with publishing experience",
  serious_games: "Designing Serious Games",
  dungeon_talk_show: "Interviewee for dungeon themed talk show",
};

/** Label → enum value, for reading Airtable. */
export function fromLabel<V extends string>(
  labels: Record<V, string>,
  label: string | null | undefined,
): V | null {
  if (label == null) return null;
  const hit = (Object.entries(labels) as [V, string][]).find(
    ([, l]) => l === label,
  );
  return hit ? hit[0] : null;
}
