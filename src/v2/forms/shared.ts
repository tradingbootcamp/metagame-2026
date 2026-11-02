import { SOCIAL_LINKS } from "@/v2/lib/urls";
import type { Answers, Option, Question } from "./engine";
import { picked } from "./engine";

/** Options straight from Airtable's choice names. */
export const opts = (...values: string[]): Option[] =>
  values.map((value) => ({ value }));

// The volunteer and financial aid applications are two forms on one table,
// so they share these fields (and their ids).

export const basicFacts = (): Question[] => [
  {
    key: "legalName",
    field: "fldx0ZAFnlvro2cYE",
    fill: "name",
    type: "text",
    label: "Full legal name",
    required: true,
    autoComplete: "name",
    row: "name",
  },
  {
    key: "preferredName",
    field: "fldSfrVxG4ztueh5s",
    type: "text",
    label: "Preferred name",
    autoComplete: "nickname",
    row: "name",
  },
  {
    key: "pronouns",
    field: "fldjo23IzCU37RHdn",
    fill: "pronouns",
    type: "text",
    label: "Pronouns",
    row: "pronouns",
  },
  {
    key: "email",
    field: "fldeUEx8CainGHRtC",
    fill: "email",
    type: "email",
    label: "Email address",
    required: true,
    autoComplete: "email",
    row: "contact",
  },
  {
    key: "phone",
    field: "flduCvMAF9ljtGHBH",
    type: "phone",
    label: "Phone number",
    required: true,
    autoComplete: "tel",
    row: "contact",
  },
  {
    key: "discord",
    field: "fldOWbALma2y4KsWj",
    fill: "discord",
    type: "text",
    label: "Discord handle",
    aside: `[join our Discord](${SOCIAL_LINKS.DISCORD})`,
    placeholder: "@yourname",
    row: "discord",
  },
];

// The volunteer form's version: yes or no, with a box for the ticket's email
// when it isn't the one above. Airtable's options name the ticket type, so
// typecast adds a plain "Yes" the first time someone picks it.
export const hasTicket: Question = {
  key: "ticket",
  field: "fldhK2vXDqnEMr9oV",
  type: "choice",
  asList: true,
  label: "Do you already have a ticket?",
  help: "So we can sort out a refund if you end up with a volunteer ticket.",
  required: true,
  options: [
    {
      value: "Yes",
      more: {
        key: "ticketEmail",
        label: "Ticket email, if different",
        into: "questions",
        input: "email",
        placeholder: "Only if you bought it with another email",
      },
    },
    { value: "No" },
  ],
};

const SHIFTS = opts("9am-1pm", "1pm-5pm", "5pm-9pm", "9pm-1am");

export const availability = (
  labelFor: (day: string) => string,
  show?: (a: Answers) => boolean,
): Question[] => [
  {
    key: "friday",
    field: "fldSt5mOjLRT2epez",
    type: "choices",
    label: labelFor("Friday, Nov 6"),
    options: SHIFTS,
    show,
  },
  {
    key: "saturday",
    field: "fldDJPiiKlERF5eVV",
    type: "choices",
    label: labelFor("Saturday, Nov 7"),
    options: SHIFTS,
    show,
  },
  {
    key: "sunday",
    field: "fld0yEJ2vApo3DUGk",
    type: "choices",
    label: labelFor("Sunday, Nov 8"),
    options: SHIFTS,
    show,
  },
  {
    key: "otherTimes",
    field: "fldkHQrfHn4S0GFhw",
    type: "choices",
    label: labelFor("Around the weekend"),
    options: opts(
      "2pm-6pm Thursday (11/5)",
      "6pm-10pm Thursday (11/5)",
      "9am-1pm Monday (11/9)",
      "1pm-5pm Monday (11/9)",
      "Further in advance (onsite)",
      "Further in advance (virtual)",
    ),
    show,
  },
];

// The three team lists differ slightly, as they do in Airtable. Web
// development and running the Megagame aren't in Airtable's "sounds fun"
// list, nor is MCing in its "lead" list; typecast adds each the first time
// someone picks it, so the volunteer board can offer every mark on every
// team.
const TEAMS_WANTED = opts(
  "Registration desk",
  "Info desk",
  "Room check (for sessions)",
  "Physical labor",
  "Childcare",
  "AV support (e.g. setting up projectors)",
  "Web development (e.g. programming mini games)",
  "Marketing (requires advance work)",
  "Megagame design (requires advance work)",
  "Helping run the megagame (during the conference)",
  "Set design / physical fabrication / hardware / construction",
  "Generalist (putting out fires as needed)",
  "Community health and safety",
  "Speaker coordination",
  "MCing sessions",
  "Indifferent: Slot me in anywhere, coach!",
);
const TEAMS_AVOIDED = opts(
  "Registration desk",
  "Info desk",
  "Room check (for sessions)",
  "Physical labor",
  "Childcare",
  "Tech support (e.g. setting up projectors)",
  "Web development (e.g. programming mini games)",
  "Marketing",
  "Helping design the megagame (requires advance work)",
  "Helping run the megagame (during the conference)",
  "Set design / physical fabrication / hardware / construction",
  "Generalist (putting out fires as needed)",
  "Community health and safety",
  "Speaker coordination",
  "MCing sessions",
  "Indifferent: Slot me in anywhere, coach!",
);
const TEAMS_LED = TEAMS_AVOIDED;

/** The three team lists: which sound fun, which to skip, which to lead. */
export const teamLists = (
  wantedHelp: string,
  show?: (a: Answers) => boolean,
): Question[] => [
  {
    key: "teams",
    field: "fldHALGXaoGE46RpK",
    type: "choices",
    label: "Which teams sound fun?",
    help: wantedHelp,
    options: TEAMS_WANTED,
    show,
  },
  {
    key: "notTeams",
    field: "fldPTPTWuxUDCoqVx",
    type: "choices",
    label: "Any teams you'd definitely not want to be on?",
    help: "Select all that apply.",
    options: TEAMS_AVOIDED,
    show,
  },
  {
    key: "leadTeams",
    field: "fld8QudBRRC2VfjpC",
    type: "choices",
    label: "Interested in leading a team?",
    help: "Select all that apply, though you'd lead at most one team in all likelihood. This isn't a commitment, just a registration of interest.",
    options: TEAMS_LED,
    show,
  },
];

export const skills = (show?: (a: Answers) => boolean): Question => ({
  key: "skills",
  field: "fldKE9LJgDSGvID8c",
  type: "longtext",
  label: "Special skills",
  help: "Any expertise that might be useful? For example: photography, graphic design, building physical sets, marketing, food coordination, childcare experience.",
  show,
});

export const teams = (
  wantedHelp: string,
  show?: (a: Answers) => boolean,
): Question[] => [...teamLists(wantedHelp, show), skills(show)];

const BAY_AREA =
  "I live in the Bay Area or will be there leading up to the event";

export const aboutYou = (show?: (a: Answers) => boolean): Question[] => [
  {
    key: "facts",
    field: "fld2O5RnKRasHaICM",
    type: "choices",
    label: "Other details",
    help: "Select any of these that apply.",
    options: opts(
      BAY_AREA,
      "I will have a car available before or during the conference",
      "I can potentially host people from out of town",
      "I'm under 18",
      "I am reading this list",
      "I've been to Lighthaven before",
      "I attended Metagame 2025",
      "I volunteered at Metagame 2025",
    ),
    show,
  },
  {
    key: "bayArea",
    field: "fldDQeWu2JuNiGAVc",
    type: "text",
    label: "Where in the Bay do you live?",
    show: (a) => (!show || show(a)) && picked(a.facts, BAY_AREA),
  },
];

export const disability: Question[] = [
  {
    key: "disability",
    field: "fldop9OSipqpzA5kN",
    type: "toggle",
    label: "Anything we should take into account?",
    text: "I have a disability, injury, limitation, or other special circumstance I'd like you to take into account.",
  },
  {
    key: "disabilityDetails",
    field: "flduWj3W17FolXLcz",
    type: "longtext",
    label: "Details",
    help: "Anything about your disability, limitation, injury or circumstance that might be relevant to your conference participation.",
    show: (a) => a.disability === true,
  },
  {
    key: "accommodations",
    field: "fldVnyBN1RV7o6O3K",
    type: "longtext",
    label: "Accommodations",
    help: "If you'd like us to provide accommodations to make the conference possible, safe or comfortable for you, tell us about them here.",
    show: (a) => a.disability === true,
  },
];

export const howFound: Question = {
  key: "howFound",
  field: "fld8C7bDg1BecBUOf",
  type: "text",
  label: "How did you find out about Metagame?",
  required: true,
};

export const reference = (help: string): Question => ({
  key: "reference",
  field: "fldymx40W43Persqt",
  type: "text",
  label: "Reference",
  help,
});

export const questions: Question = {
  key: "questions",
  field: "fldPS7frcgeKU7nBL",
  type: "longtext",
  label: "Any questions for us?",
};

/** The table's attribution fields, filled from the visitor's stored UTMs. */
export const VOLUNTEER_UTM_FIELDS = {
  utm_source: "fldtsinraLnOjEe4y",
  utm_medium: "fldqGkebFBsmrAc29",
  utm_campaign: "fldOQZI0xbwo7PdZb",
};
