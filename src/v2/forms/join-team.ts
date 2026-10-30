import { airtableConfig } from "@/lib/airtable-config";
import {
  JOIN_TEAM_FORM_URL,
  RFP_FORM_URL,
  VOLUNTEER_APPLY_PATH,
} from "@/v2/lib/links";
import type { FormDef } from "./engine";
import { picked } from "./engine";

// The interest form from /team, on the Interest Intake table the Airtable
// form wrote to, like the email signups.
export const joinTeam: FormDef = {
  slug: "join-team",
  path: JOIN_TEAM_FORM_URL,
  tableId: airtableConfig.signupsTableId,
  name: "Get involved",
  eyebrow: "Interest form · Metagame 2026",
  title: "Get involved with Metagame",
  pitch:
    "Tell us how you'd like to help with Metagame 2026, whether that's volunteering, speaking, organizing or sponsoring, and we'll follow up with the next step.",
  aside: "This should only take about a minute.",
  steps: [
    {
      key: "details",
      title: "A few details",
      items: [
        {
          key: "name",
          field: "fld42qY2zzbMKiZAC",
          type: "text",
          label: "Your name",
          required: true,
          autoComplete: "name",
          row: "who",
        },
        {
          key: "email",
          field: "fld0okgOArTQTNUir",
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
          help: "Select any of these that apply.",
          options: [
            {
              value: "volunteering",
              label: "Volunteering",
              glyph: "party-games",
            },
            { value: "speaking", label: "Speaking", glyph: "talks" },
            { value: "organizing", label: "Organizing", glyph: "workshops" },
            { value: "sponsoring", label: "Sponsoring", glyph: "megagame" },
            {
              value: "email list",
              label: "The email list",
              glyph: "crosswords",
            },
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
          type: "longtext",
          label: "Anything else?",
          help: "Questions, ideas, or anything we should know.",
        },
      ],
    },
  ],
  done: {
    title: "Thanks, we'll be in touch.",
    body: "We'll follow up with the next step. Can't wait? Jump straight in:",
    links: [
      { label: "Apply to volunteer", href: VOLUNTEER_APPLY_PATH },
      { label: "Propose a session", href: RFP_FORM_URL },
      { label: "Back to the homepage", href: "/" },
    ],
  },
};
