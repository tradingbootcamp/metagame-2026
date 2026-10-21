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

/**
 * The "Next steps" option for a phase. Two phases span two options each, told
 * apart by whether anyone is grading it yet and whether it has a shepherd.
 */
export function nextStepsFor(
  phase: (typeof sessionPhase)["enumValues"][number] | null,
  { graded, shepherded }: { graded: boolean; shepherded: boolean },
): string | null {
  switch (phase) {
    case null:
      return null;
    case "grading":
      return graded ? "1. Grade" : "0. Assign grader";
    case "deciding":
      return "2. Committee decision";
    case "notifying":
      return "3. Email speaker with verdict";
    case "shepherding":
      return shepherded ? "5. Shepherd meeting" : "4. Assign shepherd";
    case "scheduling":
      return "6. Add to schedule";
    case "ready":
      // The trailing space is part of the Airtable option.
      return "7. None! We're good :) ";
    case "declined":
      return "N/A";
  }
}

/**
 * Committee members as the Grader and Shepherd selects name them. Their
 * account emails live server-side in rfp-committee.ts; this file is bundled
 * for the browser. The Grader select lacks Jisk and Julian Wise.
 */
export const COMMITTEE_NAMES: readonly string[] = [
  "John Bromels",
  "Brian Smiley",
  "Ben Karcher",
  "Brendan Hurst",
  "Tommy Honton",
  "Sparr Risher",
  "Michael Sheely",
  "Ricki Heicklen",
  "Jisk",
  "Scott Gillies",
  "Julian Wise",
];

/** "Lighthaven Space Options" label → locations.name. */
export const SPACE_OPTION_LOCATIONS: Record<string, string> = {
  "Rat Park (Outdoors, Max 300)": "Rat Park",
  "The Gardens (Outdoors, Max 80)": "The Gardens",
  "Central Courtyard (Outdoors, Max 200)": "Central Courtyard",
  "Glass Hall (A, first floor side, Max 35)": "Glass Hall",
  "2A4 Thingspace i.e. secret attic room (A, second floor, Max 20)":
    "Thingspace",
  "Bayes Ground (B, 1st floor, Max 40)": "Bayes Ground",
  "2B1 New Caprica (B, 2nd floor, Max 30)": "New Caprica",
  "Bayes Attic (B, 3rd floor, Max 35)": "Bayes Attic",
  "Cantor's Diagonal (C, Max 60)": "Cantor's Diagonal",
  "1D1 (D, 1st floor, Max 6)": "1D1",
  "Eigen Hall (E, 1st floor, Max 40)": "Eigen Hall",
  "2E1 Gyroscope (E, 2nd floor, Max 30)": "Gyroscope",
  Other: "Other",
};
