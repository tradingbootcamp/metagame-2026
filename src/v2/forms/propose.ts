import { airtableConfig } from "@/lib/airtable-config";
import { MEGAGAME_PROPOSAL_FORM_URL, RFP_FORM_URL } from "@/v2/lib/links";
import { SOCIAL_LINKS } from "@/v2/lib/urls";
import type { FormDef } from "./engine";
import { opts } from "./shared";

// The request for proposals: a session (talk, game, workshop, anything) for
// the program. Lands in RFP Submissions, where the speaker committee grades
// it.
export const propose: FormDef = {
  slug: "propose",
  path: RFP_FORM_URL,
  tableId: airtableConfig.rfpSubmissionsTableId,
  name: "Session proposal",
  eyebrow: "Request for proposals · Metagame 2026",
  title: "Propose a session",
  pitch: `Run something at Metagame!\nPitch a talk, a game, a workshop, or something stranger to run at Metagame this November 6–8. The speaker committee reads every proposal and gets back to you. Building a puzzle or game for the all-weekend Megagame instead? That has [its own form](${MEGAGAME_PROPOSAL_FORM_URL}). For a sense of what fits, see [last year's program](/last-year).`,
  aside: "This form should only take about 10 minutes.",
  warning:
    "The proposal deadline has passed. You can still send one in, and we may still find it a slot, but we can't promise to.",
  steps: [
    {
      key: "host",
      title: "Who are you?",
      items: [
        {
          key: "name",
          field: "fldniBh49aomPd5hd",
          fill: "name",
          type: "text",
          label: "Your name",
          required: true,
          autoComplete: "name",
          row: "host",
        },
        {
          key: "cohosts",
          field: "fldXxvUxOJbApec8G",
          type: "text",
          label: "Cohosts",
          help: "Running it with others? Their names here.",
          row: "host",
        },
        {
          key: "email",
          field: "fldNNl1m58zR43KUB",
          fill: "email",
          type: "email",
          label: "Email address",
          required: true,
          autoComplete: "email",
          row: "contact",
        },
        {
          key: "discord",
          field: "fldAlMupeupZbJUFk",
          fill: "discord",
          type: "text",
          label: "Discord handle",
          aside: `[join our Discord](${SOCIAL_LINKS.DISCORD})`,
          placeholder: "@yourname",
          row: "contact",
        },
      ],
    },
    {
      key: "kind",
      title: "What kind of thing is it?",
      items: [
        {
          key: "category",
          field: "fldYq5ZlqNDwRKLRu",
          type: "choices",
          label: "Category",
          help: "Select any of these that apply.",
          options: [
            { value: "Lecture / talk", glyph: "talks" },
            { value: "Panel", glyph: "panel" },
            { value: "Workshop", glyph: "workshops" },
            { value: "Board/card game", glyph: "board-games" },
            { value: "Playtesting something in progress", glyph: "card-games" },
            { value: "TTRPG", glyph: "dice" },
            { value: "Immersive experience", glyph: "escape-rooms" },
            { value: "LARP", glyph: "larps" },
            { value: "Competition / tournament", glyph: "trophy" },
            { value: "Social deception game", glyph: "party-games" },
            { value: "Puzzle", glyph: "puzzles" },
            { value: "Puzzle huntish thing", glyph: "crosswords" },
            { value: "Jubensha", glyph: "party-games" },
            { value: "Icebreakery activity", glyph: "ice" },
            { value: "Physical activity", glyph: "physical" },
            { value: "Q&A", glyph: "trivia" },
            { value: "Selling or demoing a product", glyph: "dollar" },
            {
              value: "Part of the Megagame (see more info below)",
              label: "Part of the Megagame",
              glyph: "megagame",
            },
            {
              value: "Something weirder than any of the above options",
              label: "Something weirder than all of these",
            },
            {
              value: "Other",
              more: {
                key: "categoryOther",
                label: "What kind of thing it is",
                into: "context",
              },
            },
          ],
        },
      ],
    },
    {
      key: "pitch",
      title: "Pitch it",
      intro:
        "The title and description go on the public schedule. You can change them later.",
      items: [
        {
          key: "title",
          field: "fldUiKcH1uUsVqig6",
          type: "text",
          label: "Title",
          required: true,
          max: 120,
        },
        {
          key: "description",
          field: "fldndEfMtSxIRBld0",
          type: "longtext",
          label: "Description for the schedule",
          help: "Two or three sentences. This will appear on the public schedule.",
          required: true,
          max: 800,
        },
        {
          key: "context",
          field: "fldCdTcIyzpR20bJG",
          type: "longtext",
          label: "Tell us everything",
          help: "Your vision, how you'd run it, how far along it is. Only the team sees this.",
        },
      ],
    },
    {
      key: "logistics",
      title: "When and where",
      items: [
        {
          key: "duration",
          field: "fldjX0LtQNCdGFisr",
          type: "text",
          label: "How long does it run?",
          placeholder: "1 hour",
          required: true,
          max: 80,
          row: "duration",
        },
        {
          key: "timing",
          field: "fldPhrhxovWJ3V5kn",
          type: "longtext",
          label: "Timing needs",
          help: 'For example, "I can\'t run this on Friday" or "it must be at night, but any night works."',
        },
        {
          key: "space",
          field: "fldITeLEeSaeZOfhl",
          type: "longtext",
          label: "Space needs",
          help: 'For example, "indoors, with a projector," "a round table for 7," or "the room must go fully dark."',
        },
        {
          key: "bespoke",
          field: "fldKp1AZCiV0TGNnc",
          type: "longtext",
          label: "Anything unusual you need?",
          help: 'Anything not covered above, like "two giant chess sets on opposite ends of campus," or "this is really an ad for my product, which I\'ll also sell during the session."',
        },
      ],
    },
    {
      key: "players",
      title: "Who's it for?",
      items: [
        {
          key: "minimum",
          field: "fldcG8kpbYamOUFMr",
          type: "number",
          label: "Minimum players",
          help: "Not counting hosts. Blank if anyone can drop in.",
          min: 0,
          max: 1000,
          row: "players",
        },
        {
          key: "maximum",
          field: "fldRpAuLCHje72Z3b",
          type: "number",
          label: "Maximum players",
          help: "Not counting hosts.",
          min: 0,
          max: 1000,
          row: "players",
        },
        {
          key: "age",
          field: "fldICHNOyMQJq7RUz",
          type: "choices",
          label: "Who's it for?",
          required: true,
          options: [
            ...opts(
              "Appropriate for all ages",
              "Primarily for children",
              "Adults only (18+)",
            ),
            {
              value: "Other",
              more: { key: "ageOther", label: "Who it's for", into: "context" },
            },
          ],
        },
        {
          key: "application",
          field: "fldXgOwFbED8kH1Lj",
          type: "longtext",
          label: "Handpicking players?",
          help: "If people need to apply, link the application or describe the process and its timeline.",
        },
        {
          key: "constraints",
          field: "fldlG50bYU7g1v8Qu",
          type: "longtext",
          label: "Anything that limits who'd want to come?",
          help: "Ability constraints, content warnings, anything else people should know before they sign up.",
        },
      ],
    },
    {
      key: "more",
      title: "A few more things",
      items: [
        {
          key: "picture",
          field: "fldxZvtxqGBAHEBO1",
          type: "file",
          label: "Picture",
          help: "It goes on the public schedule next to your session, so pick one you're happy for the internet to see. Your cat or cactus works too.",
          accept: ["image/jpeg", "image/png", "image/webp"],
          maxBytes: 3_000_000,
        },
        {
          key: "link",
          field: "fldKAUgbBp7BLGuwU",
          type: "text",
          label: "A link for your profile",
          help: "Ideally something games-related you do. It goes on the schedule too.",
          placeholder: "https://",
        },
        {
          key: "anythingElse",
          field: "fld4jmHBnJTAcy8Md",
          type: "longtext",
          label: "Anything else?",
          help: "Need an answer soon? Say so here.",
        },
      ],
    },
  ],
  done: {
    title: "Thanks, your proposal is in.",
    body: "The speaker committee reads every proposal and will get back to you.",
    links: [
      { label: "See what happened last year", href: "/last-year" },
      { label: "Back to the homepage", href: "/" },
    ],
  },
};
