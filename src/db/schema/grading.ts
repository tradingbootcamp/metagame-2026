import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, user } from "./auth";
import {
  locations,
  sessionDropins,
  sessions,
  sessionVerdict,
} from "./schedule";

export const rubricGrade = pgEnum("rubric_grade", [
  "best",
  "good",
  "meh",
  "bad",
  "unclear",
]);
export const shepherdMatch = pgEnum("shepherd_match", [
  "positive",
  "neutral",
  "negative",
  "other",
]);
export const topicArea = pgEnum("topic_area", [
  "board_games",
  "card_games",
  "ttrpgs",
  "larps",
  "word_puzzles",
  "number_puzzles",
  "puzzle_hunts",
  "escape_rooms",
  "video_games",
  "physical_games",
  "party_game",
  "immersive_experience",
]);
export const potentialPanel = pgEnum("potential_panel", [
  "professional_gm",
  "game_publishers",
  "serious_games",
  "dungeon_talk_show",
]);

export const sessionGrades = pgTable(
  "session_grades",
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid()
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    graderUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    operationalEase: rubricGrade(),
    hostCompetence: rubricGrade(),
    hostNameRecognition: rubricGrade(),
    subjectMatter: rubricGrade(),
    fun: rubricGrade(),
    verdictRecommendation: sessionVerdict(),
    qualityNotes: text(),
    schedulerNotes: text(),
    shepherdMatch: shepherdMatch(),
    topicAreas: topicArea()
      .array()
      .notNull()
      .default(sql`'{}'`),
    potentialPanels: potentialPanel()
      .array()
      .notNull()
      .default(sql`'{}'`),
    megagameIntegration: text(),
    expectedCrowdSize: integer(),
    allowDropins: sessionDropins(),
    // Null while the grade is only an assignment.
    submittedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique("session_grades_session_grader_unique").on(
      t.sessionId,
      t.graderUserId,
    ),
    index("session_grades_grader_user_id_idx").on(t.graderUserId),
    check(
      "session_grades_expected_crowd_size_nonnegative",
      sql`${t.expectedCrowdSize} >= 0`,
    ),
  ],
);

export const sessionGradeSpaceOptions = pgTable(
  "session_grade_space_options",
  {
    gradeId: uuid()
      .notNull()
      .references(() => sessionGrades.id, { onDelete: "cascade" }),
    locationId: uuid()
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.gradeId, t.locationId] }),
    index("session_grade_space_options_location_id_idx").on(t.locationId),
  ],
);
