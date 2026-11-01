import { describe, expect, it } from "vitest";
import { parseCsv, parseQuestCsv } from "./megagame-quest-csv";

const HEADER =
  "code,title,class,kind,answers,evidence,hint,min_level,max_level";

describe("parseCsv", () => {
  it("splits commas and keeps quoted commas, quotes and newlines", () => {
    expect(parseCsv('a,"b, c","say ""hi""","two\nlines"\n1,2,3,4')).toEqual([
      ["a", "b, c", 'say "hi"', "two\nlines"],
      ["1", "2", "3", "4"],
    ]);
  });

  it("reads tab-separated text pasted from a spreadsheet", () => {
    expect(parseCsv("a\tb, c\r\n1\t2\r\n")).toEqual([
      ["a", "b, c"],
      ["1", "2"],
    ]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n  \n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseQuestCsv", () => {
  it("reads an answer quest and an evidence quest", () => {
    const text = [
      HEADER,
      "a2c-4ef,The riddle,Wizard,answer,Fire | flame ,,Look up,2,3",
      ',Human pyramid,,evidence,,"Six people, one pyramid",,,',
    ].join("\n");
    expect(parseQuestCsv(text)).toEqual({
      errors: [],
      rows: [
        {
          code: "A2C4EF",
          title: "The riddle",
          class: "wizard",
          kind: "answer",
          answers: ["Fire", "flame"],
          evidence: null,
          hint: "Look up",
          minLevel: 2,
          maxLevel: 3,
        },
        {
          code: null,
          title: "Human pyramid",
          class: null,
          kind: "evidence",
          answers: [],
          evidence: "Six people, one pyramid",
          hint: null,
          minLevel: null,
          maxLevel: null,
        },
      ],
    });
  });

  it("accepts headers in any order, case and spacing, and leaves out optional columns", () => {
    const { rows, errors } = parseQuestCsv(
      "Kind\tTitle\tMin Level\tClass\tAnswers\nanswer\tQ\t1\tpirate\tx",
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      code: null,
      title: "Q",
      kind: "answer",
      class: "pirate",
      minLevel: 1,
      maxLevel: null,
      answers: ["x"],
    });
  });

  it("refuses a paste with no rows", () => {
    expect(parseQuestCsv("")).toEqual({
      rows: [],
      errors: ["Paste a header row and at least one quest."],
    });
    expect(parseQuestCsv(HEADER).errors).toEqual([
      "Paste a header row and at least one quest.",
    ]);
  });

  it("names unknown and missing columns", () => {
    expect(parseQuestCsv("title,colour\nQ,red").errors).toEqual([
      'Unknown column "colour".',
      'Missing column "kind".',
    ]);
  });

  it("reports each bad row by its line and returns no rows", () => {
    const text = [
      HEADER,
      ",,wizard,answer,x,,,,",
      ",Q,sorcerer,answer,x,,,,",
      ",Q,,riddle,,,,,",
      ",Q,,answer, | ,,,,",
      ",Q,,evidence,,,,,",
      ",Q,wizard,answer,x,,,0,6",
      ",Q,wizard,answer,x,,,3,2",
      ",Q,,answer,x,,,2,",
      ",Q,wizard,answer,x,,,two,",
      "A2C4,Q,,answer,x,,,,",
    ].join("\n");
    const { rows, errors } = parseQuestCsv(text);
    expect(rows).toEqual([]);
    expect(errors).toEqual([
      "Line 2: title is required.",
      'Line 3: class "sorcerer" is not one of wizard, pirate, alien.',
      'Line 4: kind must be "answer" or "evidence".',
      "Line 5: an answer quest needs at least one answer.",
      "Line 6: an evidence quest needs the evidence text.",
      "Line 7: min_level must be a whole number from 1 to 5.",
      "Line 7: max_level must be a whole number from 1 to 5.",
      "Line 8: min_level is above max_level.",
      "Line 9: a level window needs a class.",
      "Line 10: min_level must be a whole number from 1 to 5.",
      "Line 11: code must be six characters.",
    ]);
  });

  it("refuses the same code twice in one paste", () => {
    const text = [
      HEADER,
      "A2C4EF,Q1,,answer,x,,,,",
      "a2c-4ef,Q2,,answer,y,,,,",
    ].join("\n");
    expect(parseQuestCsv(text).errors).toEqual([
      "Line 3: code A2C-4EF is already used on line 2.",
    ]);
  });

  it("refuses evidence and hints longer than 2000 characters", () => {
    const long = "x".repeat(2001);
    const text = [
      HEADER,
      `,Q,,evidence,,${long},,,`,
      `,Q,,answer,x,,${long},,`,
      `,Q,,evidence,,${"y".repeat(2000)},${"z".repeat(2000)},,`,
    ].join("\n");
    expect(parseQuestCsv(text).errors).toEqual([
      "Line 2: evidence is longer than 2000 characters.",
      "Line 3: hint is longer than 2000 characters.",
    ]);
  });

  it("refuses a column that appears twice", () => {
    expect(parseQuestCsv("title,kind,Title\nQ,answer,R").errors).toEqual([
      'Column "title" appears more than once.',
    ]);
  });

  it("names the line where an unclosed quote starts", () => {
    const text = [
      HEADER,
      ",Q,,answer,x,,,,",
      ',"R,,answer,y,,,,',
      ",S,,answer,z,,,,",
    ].join("\n");
    expect(parseQuestCsv(text)).toEqual({
      rows: [],
      errors: ["Line 3: a quote is never closed."],
    });
  });

  it("counts lines across a quoted newline", () => {
    const text = [
      HEADER,
      ',Q,,evidence,,"one\ntwo",,,',
      ",,,answer,x,,,,",
    ].join("\n");
    expect(parseQuestCsv(text).errors).toEqual(["Line 4: title is required."]);
  });
});
