import { airtableConfig } from "@/lib/airtable-config";
import {
  MEGAGAME_PROPOSAL_FORM_URL,
  VOLUNTEER_APPLY_PATH,
} from "@/v2/lib/links";
import { SOCIAL_LINKS } from "@/v2/lib/urls";
import type { FormDef } from "./engine";
import {
  aboutYou,
  availability,
  basicFacts,
  disability,
  hasTicket,
  howFound,
  questions,
  reference,
  skills,
  teamLists,
  VOLUNTEER_UTM_FIELDS,
} from "./shared";

// The volunteer application, on the table the Airtable form wrote to.
export const volunteer: FormDef = {
  slug: "volunteer",
  path: VOLUNTEER_APPLY_PATH,
  tableId: airtableConfig.volunteersTableId,
  name: "Volunteer application",
  eyebrow: "Application · Metagame 2026",
  title: "Volunteer at Metagame",
  pitch:
    "Join the team and help make Metagame happen. We need volunteers both in the lead-up to the conference and during the weekend itself, and volunteers get a discounted or free ticket depending on how much they can take on.",
  aside: "This application should only take about 5 minutes.",
  notice:
    "Your application will be visible to the Metagame team. If you'd rather tell us something privately, [contact Ricki](contact:ricki).",
  utmFields: VOLUNTEER_UTM_FIELDS,
  steps: [
    {
      key: "you",
      title: "Who are you?",
      items: basicFacts(),
    },
    {
      key: "shifts",
      title: "When are you available?",
      intro:
        "Select any times you could be available. These are not hard commitments, and you are not committing to work during every slot you select.",
      view: "schedule",
      items: availability((day) => day),
    },
    {
      key: "teams",
      title: "Team interests",
      intro: "Every volunteer attends a 1–2 hour orientation before the event.",
      view: "teams",
      items: teamLists("What kind of work are you most excited about?"),
    },
    {
      key: "skills",
      title: "Skills and limits",
      items: [
        skills(),
        {
          key: "timeLimits",
          field: "fldxkBihmM83NONQ2",
          type: "longtext",
          label: "Time limitations",
          help: "Any time constraints we should know about? Include it if you're leading or responsible for a session at Metagame.",
        },
      ],
    },
    {
      key: "more",
      title: "A few more things",
      items: [
        ...disability,
        ...aboutYou(),
        howFound,
        reference(
          "If somebody referred you to volunteer, put their name and email here.",
        ),
        questions,
        hasTicket,
      ],
    },
  ],
  done: {
    title: "Thanks, we've got it.",
    body: "Applications are processed in the order they arrive. We'll be in touch about teams and shifts, and every volunteer gets a 1–2 hour orientation before the weekend.",
    links: [
      { label: "Join the Discord", href: SOCIAL_LINKS.DISCORD },
      {
        label: "Make a puzzle for the Megagame",
        href: MEGAGAME_PROPOSAL_FORM_URL,
      },
      { label: "Back to the homepage", href: "/" },
    ],
  },
};
