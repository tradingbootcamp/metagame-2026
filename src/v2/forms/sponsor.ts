import { airtableConfig } from "@/lib/airtable-config";
import { SPONSOR_FORM_URL } from "@/v2/lib/links";
import type { Answers, FormDef } from "./engine";
import { opts } from "./shared";

// Sponsor interest, on the Interest Intake table the Airtable form wrote to,
// like the email signups.
export const sponsor: FormDef = {
  slug: "sponsor",
  path: SPONSOR_FORM_URL,
  tableId: airtableConfig.signupsTableId,
  name: "Sponsor interest",
  eyebrow: "Interest form · Metagame 2026",
  title: "Sponsor Metagame",
  pitch:
    "Tell us who you are and what you have in mind, and someone from the team will reach out to talk it through. Every package is flexible; what each tier includes is on the [sponsor page](/sponsor).",
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
          key: "company",
          field: "fldb4I32HWFaiFWWd",
          type: "text",
          label: "Company or organization",
          autoComplete: "organization",
          row: "who",
        },
        {
          key: "email",
          field: "fld0okgOArTQTNUir",
          type: "email",
          label: "Email",
          required: true,
          autoComplete: "email",
          row: "email",
        },
        {
          key: "tier",
          field: "fldvRIark8ZyTFpNf",
          type: "choice",
          label: "Sponsorship tier",
          help: "Not sure yet? Pick Other, or leave it and we'll talk it through.",
          options: opts(
            "Headline",
            "Platinum",
            "Gold",
            "Silver",
            "Patron",
            "Other",
          ),
        },
        {
          key: "notes",
          field: "fldBaSmooUULI2bbe",
          type: "longtext",
          label: "Anything else?",
          help: "What you're hoping to get out of it, questions, or how you'd like us to follow up.",
        },
        // Never shown: every row from this form is a sponsor lead. beforeWrite
        // opens it and writes the tag the sponsor automations key off.
        {
          key: "interests",
          field: "fldmLx6E4fpMxaVHw",
          type: "choices",
          label: "Type of interest",
          options: opts("sponsoring"),
          show: (a) => a.stamp === true,
        },
      ],
    },
  ],
  // The Airtable form used an automation to stamp "sponsoring" onto each row;
  // record-created triggers can't tell a sponsor from an email signup on the
  // same table, so the site writes the tag itself.
  beforeWrite: (a: Answers) => ({
    ...a,
    stamp: true,
    interests: ["sponsoring"],
  }),
  done: {
    title: "We'll be in touch.",
    body: "Thanks for backing Metagame. Someone from the team will reach out soon.",
    links: [
      { label: "See the sponsor tiers", href: "/sponsor" },
      { label: "Back to the homepage", href: "/" },
    ],
  },
};
