import { airtableConfig } from "@/lib/airtable-config";
import { CHILD_REGISTRATION_FORM_URL } from "@/v2/lib/links";
import { SOCIAL_LINKS } from "@/v2/lib/urls";
import type { Answers, FormDef, Option, Step } from "./engine";
import { opts } from "./shared";

const kids = (a: Answers) => Number(a.count) || 0;

export const SESSION_NAMES = [
  "Friday afternoon (3pm-7pm, includes dinner)",
  "Saturday morning (9:45am-2:45pm, includes lunch)",
  "Saturday afternoon (5pm-7:30pm, includes dinner)",
  "Sunday morning (9:45am-3pm, includes lunch)",
  "Sunday afternoon (5pm-7:30pm, includes dinner)",
] as const;
const SESSIONS = opts(...SESSION_NAMES);

export const FAMILY_FIELDS = {
  name: "fldGLpEn4Bg00bnzo",
  relationship: "fld0o0mWZeGE2bbqT",
  email: "fldC3WWHFqQsm1FSl",
  phone: "fldLdQNIQq48wqWCJ",
  discord: "fld2rv0eiORYjCylO",
  count: "fld6tSDSTGDIzfYIO",
  moreChildren: "flde6wEG681bPeqjV",
  anythingElse: "fldl4KxzyKfctsPVJ",
} as const;

// Airtable has five fields for each of the first four children:
// name, age, sessions, medical, other.
export const CHILD_FIELDS = [
  [
    "fldbwI0byxE0Ehe8F",
    "fldcFNTARVwgMalTM",
    "fldsPPUcLgY1gamSP",
    "fldQ7Y4QY8vI8H8Wm",
    "fldqVRzRJmUnQQ8Jl",
  ],
  [
    "fldwNkH4SK6QhSRch",
    "fldP0UwiNTEjFPG1l",
    "fldifJWLCK1si9Pms",
    "fldEtbPCObtK2Trfb",
    "fldeCy3b1NvVvwXaL",
  ],
  [
    "fldpMDsRGHQbKg1Ii",
    "fld0vGk7H8Btue6aY",
    "fldrgiMVT5aIrHjrG",
    "fldGYiFtk3drHhtAM",
    "fldshenNhxZXQtgka",
  ],
  [
    "fldvfNyd37BogTxOr",
    "fldWhEoTwVPv9Tzss",
    "fldyNb9Z70QSnxmj7",
    "fldRZi4rY5HCiYVuE",
    "fldRLA9UFtUmOY8x5",
  ],
];
const ORDINAL = ["first", "second", "third", "fourth"];

const childStep = (i: number): Step => {
  const [name, age, times, medical, other] = CHILD_FIELDS[i];
  const n = i + 1;
  // "Other" opens a box; what's typed there joins the child's notes.
  const otherTimes: Option = {
    value: "Other",
    more: {
      key: `child${n}OtherTimes`,
      label: "Other times",
      into: `child${n}Other`,
      placeholder: "Which times would you need?",
    },
  };
  return {
    key: `child${n}`,
    title: `Your ${ORDINAL[i]} child`,
    show: (a) => kids(a) >= n,
    items: [
      {
        key: `child${n}Name`,
        field: name,
        type: "text",
        label: "Name",
        required: true,
        row: "child",
      },
      {
        key: `child${n}Age`,
        field: age,
        type: "number",
        label: "Age",
        help: "Halves are fine: 4.5.",
        decimals: 1,
        max: 17.9,
        required: true,
        row: "child",
      },
      {
        key: `child${n}Times`,
        field: times,
        type: "choices",
        label: "Childcare sessions",
        help: "Free for ages 5–12. Leave it blank if they won't need childcare.",
        options: [...SESSIONS, otherTimes],
      },
      {
        key: `child${n}Medical`,
        field: medical,
        type: "longtext",
        label: "Allergies and medical info",
      },
      {
        key: `child${n}Other`,
        field: other,
        type: "longtext",
        label: "Anything else about them?",
      },
    ],
  };
};

// Children at Metagame: every child under 18 who's coming, childcare or not,
// on the table the Airtable form wrote to. Each child gets a step of their
// own.
export const children: FormDef = {
  slug: "children",
  path: CHILD_REGISTRATION_FORM_URL,
  tableId: airtableConfig.childrenTableId,
  name: "Child registration",
  eyebrow: "Childcare · Metagame 2026",
  title: "Register your children",
  pitch:
    "Every child under 18 who's coming to Metagame needs to be registered here, whether or not they'll use childcare. Children under 13 come free, and childcare is free for ages 5–12. If yours is outside that range and you'd like childcare, say so and we'll do our best.",
  aside: "This should only take about 3 minutes.",
  notice:
    "Childcare runs Friday 3–7 pm, and Saturday and Sunday 9:45 am–3 pm and 5–7:30 pm, with drop-off in the first 15 minutes and pick-up in the last 15.",
  steps: [
    {
      key: "contact",
      title: "Who are you?",
      intro: "You're who we'll reach during the weekend if we need to.",
      items: [
        {
          key: "name",
          field: FAMILY_FIELDS.name,
          fill: "name",
          type: "text",
          label: "Name",
          required: true,
          autoComplete: "name",
          row: "name",
        },
        {
          key: "relationship",
          field: FAMILY_FIELDS.relationship,
          type: "text",
          label: "Relationship to the children",
          placeholder: "Parent, aunt, guardian…",
          row: "name",
        },
        {
          key: "email",
          field: FAMILY_FIELDS.email,
          fill: "email",
          type: "email",
          label: "Email address",
          required: true,
          autoComplete: "email",
          row: "contact",
        },
        {
          key: "phone",
          field: FAMILY_FIELDS.phone,
          type: "phone",
          label: "Phone number",
          required: true,
          autoComplete: "tel",
          row: "contact",
        },
        {
          key: "discord",
          field: FAMILY_FIELDS.discord,
          fill: "discord",
          type: "text",
          label: "Discord handle",
          aside: `[join our Discord](${SOCIAL_LINKS.DISCORD})`,
          placeholder: "@yourname",
          row: "discord",
        },
      ],
    },
    {
      key: "count",
      title: "How many are coming?",
      items: [
        {
          key: "count",
          field: FAMILY_FIELDS.count,
          type: "number",
          label: "Children you're bringing",
          help: "Anyone under 18, whether or not they'll use childcare.",
          min: 1,
          max: 20,
          required: true,
        },
      ],
    },
    ...[0, 1, 2, 3].map(childStep),
    {
      key: "more",
      title: "Your other children",
      intro: "There's room for four in detail. Tell us about the rest here.",
      show: (a) => kids(a) >= 5,
      items: [
        {
          key: "moreChildren",
          field: FAMILY_FIELDS.moreChildren,
          type: "longtext",
          label:
            "Their names, ages, childcare sessions, and allergies or medical info",
          required: true,
        },
      ],
    },
    {
      key: "else",
      title: "Anything else?",
      items: [
        {
          key: "anythingElse",
          field: FAMILY_FIELDS.anythingElse,
          type: "longtext",
          label: "Anything else you'd like us to know, or questions for us?",
        },
      ],
    },
  ],
  done: {
    title: "Thanks, they're registered.",
    body: "We'll be in touch with childcare details before the weekend.",
    links: [
      { label: "Read about childcare", href: "/childcare" },
      { label: "Back to the homepage", href: "/" },
    ],
  },
};
