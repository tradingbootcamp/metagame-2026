import { airtableConfig } from "@/lib/airtable-config";
import { EMAIL_LIST_VALUE } from "@/lib/interests";
import { INTEREST_FORM_URL, SPONSOR_FORM_URL } from "@/v2/lib/links";
import type { Answers, FormDef } from "./engine";
import { picked } from "./engine";

// The interest form linked from /team, on the Interest Intake table the Airtable
// form wrote to, like the email signups.
export const joinTeam: FormDef = {
  slug: "join-team",
  path: INTEREST_FORM_URL,
  tableId: airtableConfig.signupsTableId,
  compact: true,
  name: "Stay in the loop",
  title: "Stay in the loop",
  steps: [
    {
      key: "details",
      title: "A few details",
      hideTitle: true,
      items: [
        {
          key: "name",
          field: "fld42qY2zzbMKiZAC",
          fill: "name",
          type: "text",
          label: "Your name",
          required: true,
          autoComplete: "name",
          row: "who",
        },
        {
          key: "email",
          field: "fld0okgOArTQTNUir",
          fill: "email",
          type: "email",
          label: "Email",
          required: true,
          autoComplete: "email",
          row: "who",
        },
        {
          key: "interests",
          field: "fldmLx6E4fpMxaVHw",
          type: "choices",
          label: "I'm interested in",
          options: [
            {
              value: "volunteering",
              label: "Volunteering",
              glyph: "party-games",
            },
            { value: "speaking", label: "Speaking", glyph: "talks" },
            { value: "organizing", label: "Organizing", glyph: "workshops" },
            { value: "sponsoring", label: "Sponsoring", glyph: "megagame" },
          ],
        },
        {
          key: "skills",
          field: "fldhoOZd0qyAwizuS",
          type: "longtext",
          label: "Any skills that would help at a conference?",
          help: "Photography, EMT training, running events before, that kind of thing.",
          show: (a) =>
            picked(a.interests, "volunteering") ||
            picked(a.interests, "organizing"),
        },
        {
          key: "company",
          field: "fldb4I32HWFaiFWWd",
          type: "text",
          label: "What name would you sponsor as?",
          help: "Your company, organization, or yourself, as you'd like it listed.",
          autoComplete: "organization",
          show: (a) => picked(a.interests, "sponsoring"),
        },
        {
          key: "notes",
          field: "fldBaSmooUULI2bbe",
          type: "text",
          label: "Anything else?",
          max: 5000,
        },
      ],
    },
  ],
  // Like the homepage signup, every submission joins the mailing list.
  beforeWrite: (a: Answers) => ({
    ...a,
    interests: [
      EMAIL_LIST_VALUE,
      ...(Array.isArray(a.interests) ? a.interests : []),
    ],
  }),
  done: {
    title: "Thanks, we'll be in touch.",
    body: "We'll reach out as Metagame 2027 gets closer.",
    links: [
      {
        label: "Tell us about sponsoring",
        href: SPONSOR_FORM_URL,
        show: (a) => picked(a.interests, "sponsoring"),
      },
      { label: "Back to the homepage", href: "/" },
    ],
  },
};
