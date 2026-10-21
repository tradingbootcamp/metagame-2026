import {
  RUBRIC_KEYS,
  SPACE_OPTIONS_FIELD,
  type RubricGrade,
  type RubricKey,
} from "./grade-input";
import {
  DROPINS_LABELS,
  GRADER_VERDICT_LABELS,
  POTENTIAL_PANEL_LABELS,
  SHEPHERD_MATCH_LABELS,
  TOPIC_AREA_LABELS,
} from "./rfp-labels";

// What the grading form shows: the rubric text graders score against, and the
// other fields with their labels and the descriptions behind each ⓘ. Keys are
// the session_grades / sessions columns grade-input.ts parses; option maps are
// enum value → label. Plain data, safe in client components.

/** The five scored metrics, in the form's order, with the rubric text. */
export const RUBRIC_METRICS: readonly {
  key: RubricKey;
  label: string;
  guidance: Partial<Record<RubricGrade, string>>;
}[] = [
  {
    key: "operationalEase",
    label: "Operational ease",
    guidance: {
      best: "Few or no equipment/supply needs; flexible space/setup requirements; no cash outlay required; easy to slot in among other sessions",
      good: "Easy-to-procure / inexpensive supplies required; modest setup needs; hard requirements for space that are reasonably easy to provide",
      meh: "Requires significant supplies (in terms of cost or amount); extensive equipment needs or lengthy setup time; needs to occupy a large space for a long time for a small audience",
      bad: "Excessive resources required in terms of setup, cost, and/or procurement; assumes a feature that does not exist",
    },
  },
  {
    key: "hostCompetence",
    label: "Host competence",
    guidance: {
      best: "Highly charismatic / energetic / engaging speaker",
      good: "Relatively charismatic and engaging speaker; has hosted multiple con sessions",
      meh: "Enthusiast with little expertise; has 1–2 prior con hosting gigs, but low charisma",
      bad: "First-time presenter; tenuous grasp of subject; boring presenter",
    },
  },
  {
    key: "hostNameRecognition",
    label: "Host name recognition",
    guidance: {
      best: "“Star” status; high name recognition among general public; known expert in field; someone we should accommodate due to status",
      good: "Possesses name recognition among enthusiasts; has extensive experience in field",
      meh: "Low name recognition",
      bad: "Negative name recognition; unknown or somewhat actively disliked",
    },
  },
  {
    key: "subjectMatter",
    label: "Subject matter",
    guidance: {
      best: "Popular topic or game with a large enthusiast community; fills a void that would otherwise be empty; low barriers to participation for beginners",
      good: "Niche topic with a small group of die-hard enthusiasts, or a game/topic with broad general interest but few die-hard devotees; reasonably accessible to game fans",
      meh: "Complex game that would require “in-the-know” attendees to work; topic that is on-brand but not particularly interesting or fun; new game of unknown quality",
      bad: "Boring or confusing game/topic, or one requiring extensive player knowledge/prep that most attendees are unlikely to have",
    },
  },
  {
    key: "fun",
    label: "Fun",
    guidance: {
      best: "Absolutely!!! I will schedule my break so I can attend this.",
      good: "Yes! I’m bummed I’ll miss it, but I’ll live.",
      meh: "Maybe? Or fun for some but not for most.",
      bad: "No.",
    },
  },
];

export type FormField = {
  key: string;
  label: string;
  description?: string;
} & (
  | { kind: "text" }
  | { kind: "number" }
  | { kind: "checkbox" }
  | { kind: "select"; options: Record<string, string> }
  | { kind: "multiSelect"; options: Record<string, string> }
);

/** The non-rubric grade fields, in the order they're shown. */
export const META_FIELDS: readonly FormField[] = [
  {
    key: "qualityNotes",
    label: "Notes on quality",
    kind: "text",
    description:
      "Leave us any notes you'd like on the quality of this proposal / how it compares to the bar.",
  },
  {
    key: "expectedCrowdSize",
    label: "Expected crowd size",
    kind: "number",
    description:
      "Assuming 300 conference attendees, and that we make reasonable scheduling choices.",
  },
  {
    key: "allowDropins",
    label: "Allow dropins?",
    kind: "select",
    options: DROPINS_LABELS,
    description:
      "Does this session accommodate people dropping in (e.g. a lecture), or does it require commitment / continued participation (e.g. a game with a set number of players)?",
  },
  {
    key: "topicAreas",
    label: "Topic areas",
    kind: "multiSelect",
    options: TOPIC_AREA_LABELS,
    description: "Does this hit on certain subject areas in particular?",
  },
  {
    // The options are the rooms in the database; the page fills them in.
    key: SPACE_OPTIONS_FIELD,
    label: "Lighthaven space options",
    kind: "multiSelect",
    options: {},
    description:
      "Select all the spaces that would be a good fit for this session.",
  },
  {
    key: "schedulerNotes",
    label: "Notes for the scheduler",
    kind: "text",
    description:
      "A space for notes to the schedule/space coordinator about anything you might want to flag — e.g. “this one requires a 12 step application process that needs to start in September” or “they want to hide money in trees around campus”.",
  },
  {
    key: "shepherdMatch",
    label: "Would you be a good Shepherd for this host?",
    kind: "select",
    options: SHEPHERD_MATCH_LABELS,
    description:
      "Would you (the Grader) be a good fit to be this speaker’s Shepherd? The Shepherd is the committee member assigned to guide the speaker through everything they need to succeed: emailing them to confirm their session, meeting to help plan it, procuring materials, making sure it lands in the right space, finding them on campus.",
  },
  {
    key: "megagameIntegration",
    label: "Megagame integration",
    kind: "text",
    description:
      "Is this session worth flagging to the Megagame organizers as a potential fit for integrating into the Megagame?",
  },
  {
    key: "potentialPanels",
    label: "Potential panels",
    kind: "multiSelect",
    options: POTENTIAL_PANEL_LABELS,
    description:
      "These are panels we are considering running this year, please select any you think this speaker may be interested in and qualified for",
  },
  {
    key: "verdictRecommendation",
    label: "Your verdict recommendation",
    kind: "select",
    options: GRADER_VERDICT_LABELS,
    description:
      "Your recommendation as the grader. The committee's own call lives in Verdict, below.",
  },
];

/** The form's checkbox, saved apart from the grade: it's a session column. */
export const MARKETING_CONSENT_FIELD = "marketingConsent";

/**
 * The hidden input carrying a note's value as the page loaded it, so the save
 * can tell which notes this form actually changed.
 */
export const loadedKey = (key: string) => `loaded:${key}`;

/** The shepherd's running notes on the host, written from the proposal page. */
export const SHEPHERD_NOTES_FIELDS: readonly FormField[] = [
  {
    key: "communicationNotes",
    label: "Communication notes",
    kind: "text",
    description:
      "Who on the Metagame side has reached out to the host, and the state of the most recent reply: open asks/questions that still need an answer.",
  },
  {
    key: "housingStatus",
    label: "Housing status",
    kind: "text",
    description:
      "Whether we plan to cover housing, whether the host already has their own housing, and whether we are covering travel and its status.",
  },
  {
    key: "ticketState",
    label: "Ticket state",
    kind: "text",
    description:
      "Whether the host has a ticket, whether a free/comp ticket was offered, and its current state.",
  },
  {
    key: MARKETING_CONSENT_FIELD,
    label: "Session marketing consent",
    kind: "checkbox",
    description:
      "Checked when the host has agreed to us marketing their session on social media and/or the website. Unchecked means consent has not been recorded; it does not necessarily mean they declined.",
  },
];

/** The host's answers shown to the grader, in display order; `key` is on RfpContext. */
export const CONTEXT_FIELDS = [
  {
    key: "title",
    label: "Title",
    description: "Official title for us to put on the schedule.",
  },
  { key: "host", label: "Host", description: "Submitter name." },
  {
    key: "description",
    label: "Description",
    description:
      "A brief blurb (2–3 sentences) about the session, to be used on the public-facing schedule.",
  },
  {
    key: "context",
    label: "Session context",
    description:
      "What is your vision, how do you plan to run it, where are you at in the ideation process, etc?",
  },
  {
    key: "category",
    label: "Category",
    description: "What kind of thing is this?",
  },
  { key: "duration", label: "Duration", description: "e.g. “1 hour”." },
  {
    key: "minimumSize",
    label: "Minimum size",
    description:
      "Smallest number of attendees that would still allow the host to run this session.",
  },
  {
    key: "maximumSize",
    label: "Maximum size",
    description:
      "Largest number of attendees that would still allow the host to run this session.",
  },
  {
    key: "ages",
    label: "Age appropriateness",
    description: "What is the age appropriateness of this event?",
  },
  {
    key: "ageElaboration",
    label: "Age notes",
    description: "Additional age appropriateness information.",
  },
  {
    key: "needs",
    label: "Space needs",
    description:
      "e.g. “indoors, with a projector or large screen” or “a circular table that seats 7” or “the room must be able to get fully dark” or “there must be a secret trapdoor that can only be opened by speaking in Aramaic during a crescent moon”.",
  },
  {
    key: "timingConstraints",
    label: "Timing constraints",
    description:
      "e.g. “I can’t run this on Friday” or “it must be at nighttime but can happen any night”.",
  },
  {
    key: "otherConstraints",
    label: "Other constraints",
    description:
      "Ability constraints, content warnings, or other things we should be aware of that may limit who might want to attend.",
  },
  {
    key: "applicationRequired",
    label: "Application required?",
    description:
      "If the host wants to handpick attendees: a link to the application, or information about the process and timeline. Blank means no application.",
  },
  {
    key: "bespokeNeeds",
    label: "Bespoke needs?",
    description:
      "Anything not covered above, like “I want to integrate this into the Megagame somehow” or “this is actually just advertising for my product, which I will also be trying to sell to attendees during this session”.",
  },
  { key: "megagameInterest", label: "Interest in the Megagame" },
  {
    key: "anythingElse",
    label: "Anything else?",
    description: "Free space for hosts to provide more information.",
  },
  {
    key: "website",
    label: "Host link",
    description:
      "For the host’s profile on the Metagame website. Ideally a link to something games-related they do — not necessarily the thing they’re most known for.",
  },
] as const satisfies readonly {
  key: string;
  label: string;
  description?: string;
}[];

export type RfpContext = Record<
  (typeof CONTEXT_FIELDS)[number]["key"],
  string | null
>;

/** Read-only contact details shown at the top of the shepherd notes. */
export const SHEPHERD_CONTACT_FIELDS = [
  { key: "email", label: "Email", description: "Submitter email address." },
  { key: "discord", label: "Discord", description: "Host's Discord handle." },
  {
    key: "cohosts",
    label: "Cohost(s)",
    description: "If they plan to run this with others, those people’s names.",
  },
] as const;

export type ShepherdContact = Record<
  (typeof SHEPHERD_CONTACT_FIELDS)[number]["key"],
  string | null
>;

export { RUBRIC_KEYS };
