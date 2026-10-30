import { describe, expect, it } from "vitest";
import { SCHEDULE_KEYS } from "@/v2/components/journey/ScheduleBoard";
import { TEAM_KEYS, TEAMS } from "@/v2/components/journey/TeamBoard";
import {
  airtableFields,
  allQuestions,
  answerSheet,
  checkForm,
  cleanAnswers,
  optionBoxes,
  prefillAnswers,
  visibleItems,
  visibleSteps,
} from "./engine";
import { FORMS } from "./index";

const FIELD_ID = /^fld[A-Za-z0-9]{14}$/;
const TABLE_ID = /^tbl[A-Za-z0-9]{14}$/;

describe("journey definitions", () => {
  for (const def of Object.values(FORMS)) {
    describe(def.slug, () => {
      const questions = allQuestions(def);
      // Those written to Airtable; a tick that only opens another has none.
      const written = questions.filter((q) => q.field);

      it("points at a real-looking table and fields", () => {
        expect(def.tableId).toMatch(TABLE_ID);
        for (const q of written) expect(q.field, q.key).toMatch(FIELD_ID);
      });

      it("asks each field once, under its own key", () => {
        expect(new Set(questions.map((q) => q.key)).size).toBe(
          questions.length,
        );
        expect(new Set(written.map((q) => q.field)).size).toBe(written.length);
      });

      it("gives every choice question options", () => {
        for (const q of questions)
          if (q.type === "choice" || q.type === "choices")
            expect(q.options.length, q.key).toBeGreaterThan(0);
      });

      it("won't send an empty application", () => {
        const required = questions.filter((q) => q.required && !q.show);
        if (required.length)
          expect(Object.keys(checkForm(def, {}))).toEqual(
            expect.arrayContaining([required[0].key]),
          );
      });
    });
  }
});

describe("propose", () => {
  const def = FORMS.propose;
  const answers = {
    name: "Ada",
    email: "ada@example.com",
    category: ["Workshop", "Puzzle"],
    title: "Build a cipher",
    description: "We build one together.",
    duration: "1 hour",
    minimum: "4",
    age: ["Appropriate for all ages"],
  };

  it("passes when the required answers are there", () => {
    expect(checkForm(def, answers)).toEqual({});
  });

  it("writes the row by field id, with numbers as numbers", () => {
    expect(airtableFields(def, answers)).toEqual({
      fldniBh49aomPd5hd: "Ada",
      fldNNl1m58zR43KUB: "ada@example.com",
      fldYq5ZlqNDwRKLRu: ["Workshop", "Puzzle"],
      fldUiKcH1uUsVqig6: "Build a cipher",
      fldndEfMtSxIRBld0: "We build one together.",
      fldjX0LtQNCdGFisr: "1 hour",
      fldcG8kpbYamOUFMr: 4,
      fldICHNOyMQJq7RUz: ["Appropriate for all ages"],
    });
  });

  it("turns away options Airtable doesn't have and bad emails", () => {
    const e = checkForm(def, {
      ...answers,
      email: "ada",
      category: ["Juggling"],
    });
    expect(Object.keys(e).sort()).toEqual(["category", "email"]);
  });
});

describe("financial aid", () => {
  const def = FORMS["financial-aid"];
  const visible = (a: Record<string, unknown>) =>
    visibleSteps(def, a as never).flatMap((s) =>
      visibleItems(s, a as never).map((i) => i.key),
    );

  it("approves $100 off on the spot for anyone without a ticket", () => {
    const a = { ticket: ["No"], price: "$100 off (ticket price: $325)" };
    expect(visible(a)).toContain("approved");
    expect(visible(a)).not.toContain("details");
    expect(visible({ ...a, ticket: ["Yes"] })).not.toContain("approved");
  });

  it("asks about travel only when travel help is on the table", () => {
    expect(visible({ price: "Other" })).toEqual(
      expect.arrayContaining(["otherWhy", "travelFrom", "travelFunding"]),
    );
    expect(visible({ price: "50% off (ticket price: $212.50)" })).not.toContain(
      "travelFrom",
    );
  });

  it("asks the volunteer questions only of people who could help", () => {
    expect(visible({ volunteer: "No" })).not.toContain("teams");
    expect(visible({ volunteer: "Unsure" })).toContain("teams");
  });

  it("writes the ticket status as a list", () => {
    const fields = airtableFields(def, { ticket: "No" });
    expect(fields.fldhK2vXDqnEMr9oV).toEqual(["No"]);
  });
});

describe("volunteer", () => {
  const def = FORMS.volunteer;
  const options = (key: string) => {
    const q = allQuestions(def).find((x) => x.key === key)!;
    return q.type === "choice" || q.type === "choices"
      ? q.options.map((o) => o.value)
      : [];
  };

  it("marks teams with the option names Airtable has, or typecast adds", () => {
    for (const t of TEAMS) {
      expect(options("teams"), t.name).toContain(t.want);
      expect(options("notTeams"), t.name).toContain(t.avoid);
      expect(options("leadTeams"), t.name).toContain(t.lead);
    }
  });

  it("asks the questions its boards hold", () => {
    const keys = (view: string) =>
      def.steps
        .filter((s) => s.view === view)
        .flatMap((s) => s.items.map((i) => i.key));
    expect(keys("schedule")).toEqual(expect.arrayContaining(SCHEDULE_KEYS));
    expect(keys("teams")).toEqual(expect.arrayContaining(TEAM_KEYS));
  });

  it("doesn't insist on a Discord handle", () => {
    expect(checkForm(def, {})).not.toHaveProperty("discord");
  });

  it("asks about the ticket last, as yes or no", () => {
    const keys = def.steps[def.steps.length - 1].items.map((i) => i.key);
    expect(keys[keys.length - 1]).toBe("ticket");
    expect(options("ticket")).toEqual(["Yes", "No"]);
  });

  it("keeps the ticket's other email with the questions, when it's one", () => {
    const a = { ticket: "Yes", ticketEmail: "pat@example.com" };
    expect(checkForm(def, a)).not.toHaveProperty("ticketEmail");
    expect(checkForm(def, { ...a, ticketEmail: "pat" })).toHaveProperty(
      "ticketEmail",
    );
    const fields = airtableFields(def, a);
    expect(fields.fldhK2vXDqnEMr9oV).toEqual(["Yes"]);
    expect(fields.fldPS7frcgeKU7nBL).toBe(
      "Ticket email, if different: pat@example.com",
    );
    expect(
      airtableFields(def, { ...a, ticket: "No" }).fldPS7frcgeKU7nBL,
    ).toBeUndefined();
  });
});

describe("children", () => {
  const def = FORMS.children;

  it("adds a step for each child, up to four, then a catch-all", () => {
    const steps = (count: string) =>
      visibleSteps(def, { count }).map((s) => s.key);
    expect(steps("2")).toEqual([
      "contact",
      "count",
      "child1",
      "child2",
      "else",
    ]);
    expect(steps("6")).toContain("more");
    expect(steps("6")).not.toContain("child5");
  });

  it("forgets answers for children who are no longer coming", () => {
    const fields = airtableFields(def, {
      count: "1",
      child1Name: "Sam",
      child2Name: "Kit",
    });
    expect(fields.fldbwI0byxE0Ehe8F).toBe("Sam");
    expect(fields.fldwNkH4SK6QhSRch).toBeUndefined();
  });

  it("takes ages in halves", () => {
    const base = {
      name: "Pat",
      email: "pat@example.com",
      phone: "510 555 0100",
      count: "1",
      child1Name: "Sam",
    };
    expect(checkForm(def, { ...base, child1Age: "4.5" })).toEqual({});
    expect(checkForm(def, { ...base, child1Age: "4.55" })).toHaveProperty(
      "child1Age",
    );
  });
});

describe("cleanAnswers", () => {
  it("keeps only this form's questions, in shapes they can hold", () => {
    expect(
      cleanAnswers(FORMS.sponsor, {
        name: "Ada",
        tier: "Gold",
        extra: "nope",
        email: { not: "a string" },
      }),
    ).toEqual({ name: "Ada", tier: "Gold" });
  });

  it("keeps what's written in an option's text box", () => {
    expect(
      cleanAnswers(FORMS["night-market"], {
        option: "Separate arrangement discussed with the team",
        arrangement: "Talked to Ricki",
      }),
    ).toEqual({
      option: "Separate arrangement discussed with the team",
      arrangement: "Talked to Ricki",
    });
  });
});

describe("text boxes under options", () => {
  it("each lands in a team-only text question of its own form", () => {
    for (const def of Object.values(FORMS)) {
      const questions = allQuestions(def);
      for (const q of questions)
        for (const box of optionBoxes(q, {})) {
          const into = questions.find((t) => t.key === box.into);
          expect(into?.type, `${def.slug}: ${box.key}`).toBe("longtext");
          expect(questions.some((t) => t.key === box.key)).toBe(false);
        }
    }
  });

  it("writes the box's text under its heading, after the field's own answer", () => {
    const def = FORMS["night-market"];
    const option = "Separate arrangement discussed with the team";
    expect(
      airtableFields(def, {
        notes: "We need power.",
        option,
        arrangement: "Agreed a half table with Ricki",
      }).fldqd3HuyaqfvjRWA,
    ).toBe("We need power.\n\nThe arrangement: Agreed a half table with Ricki");
    expect(
      airtableFields(def, { option, arrangement: "Just this" })
        .fldqd3HuyaqfvjRWA,
    ).toBe("The arrangement: Just this");
  });

  it("show up under their question on the team's backup copy", () => {
    const def = FORMS["night-market"];
    const option = "Separate arrangement discussed with the team";
    const sheet = answerSheet(def, { option, arrangement: " Half a table " });
    expect(sheet.find((row) => row.value.includes(option))?.value).toBe(
      `${option}\nThe arrangement: Half a table`,
    );
  });

  it("drops the text once its option isn't picked", () => {
    const fields = airtableFields(FORMS.propose, {
      age: ["Adults only (18+)"],
      ageOther: "Grandparents",
    });
    expect(fields.fldCdTcIyzpR20bJG).toBeUndefined();
  });
});

describe("megagame", () => {
  const def = FORMS.megagame;
  const you = { name: "Pat", email: "pat@example.com" };

  it("starts with who you are, and asks about 2025 only of those who were there", () => {
    expect(visibleSteps(def, {})[0].key).toBe("contact");
    const asked = (a: Record<string, unknown>) =>
      visibleItems(def.steps[0], a as never).some((i) => i.key === "lastYear");
    expect(asked({})).toBe(false);
    expect(asked({ attended: true })).toBe(true);
  });

  it("needs your part in 2025 once you say you were there", () => {
    expect(checkForm(def, { ...you, attended: true }).lastYear).toMatch(
      /untick/,
    );
    expect(
      checkForm(def, {
        ...you,
        attended: true,
        lastYear: ["Attended (but not the others)"],
      }).lastYear,
    ).toBeUndefined();
  });

  it("writes Did not attend for everyone else", () => {
    const FIELD = "fldCHYyOzYiMqkeXX";
    expect(airtableFields(def, you)[FIELD]).toEqual(["Did not attend"]);
    expect(
      airtableFields(def, {
        ...you,
        attended: true,
        lastYear: ["Ran a Megagame Session"],
      })[FIELD],
    ).toEqual(["Ran a Megagame Session"]);
    // The tick itself goes nowhere.
    expect(
      Object.keys(airtableFields(def, { ...you, attended: true })),
    ).not.toContain("undefined");
  });
});

describe("prefillAnswers", () => {
  const account = {
    name: "Alex Example",
    email: "alex@example.com",
    discord: "@alex_plays",
    pronouns: "they/them",
  };

  it("fills nothing when signed out", () => {
    for (const def of Object.values(FORMS))
      expect(prefillAnswers(def, undefined)).toEqual({});
  });

  it("fills the volunteer application's basic facts", () => {
    expect(prefillAnswers(FORMS.volunteer, account)).toEqual({
      legalName: "Alex Example",
      email: "alex@example.com",
      discord: "alex_plays",
      pronouns: "they/them",
    });
  });

  it("writes the Discord handle as contact info on the Megagame form", () => {
    expect(prefillAnswers(FORMS.megagame, account)).toEqual({
      name: "Alex Example",
      email: "alex@example.com",
      otherContact: "Discord @alex_plays",
    });
  });

  it("skips what the account doesn't have", () => {
    expect(
      prefillAnswers(FORMS.propose, { name: "Alex Example", discord: " " }),
    ).toEqual({ name: "Alex Example" });
  });

  it("only fills typed-in questions", () => {
    for (const def of Object.values(FORMS))
      for (const q of allQuestions(def))
        if (q.fill) expect(["text", "email", "phone"], q.key).toContain(q.type);
  });
});
