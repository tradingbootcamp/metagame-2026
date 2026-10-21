import { describe, expect, it } from "vitest";
import {
  formToBody,
  gradeBody,
  parseGrade,
  parseSessionText,
} from "./grade-input";

const ROOM = "11111111-1111-1111-1111-111111111111";

describe("parseGrade", () => {
  it("clears every field left out, since a save replaces the row", () => {
    const r = parseGrade({ fun: "best" }, [ROOM]);
    expect(r.ok && r.value.grade).toEqual({
      operationalEase: null,
      hostCompetence: null,
      hostNameRecognition: null,
      subjectMatter: null,
      fun: "best",
      verdictRecommendation: null,
      qualityNotes: null,
      schedulerNotes: null,
      shepherdMatch: null,
      topicAreas: [],
      potentialPanels: [],
      megagameIntegration: null,
      expectedCrowdSize: null,
      allowDropins: null,
    });
    expect(r.ok && r.value.spaceLocationIds).toEqual([]);
    expect(r.ok && r.value.advance).toBe(false);
  });

  it("leaves session notes alone unless they're sent", () => {
    const r = parseGrade({ ticketState: " comp sent " }, []);
    expect(r.ok && r.value.session).toEqual({ ticketState: "comp sent" });
  });

  it("refuses a value that isn't an option", () => {
    const r = parseGrade({ fun: "Best" }, []);
    expect(!r.ok && r.field).toBe("fun");
    const list = parseGrade({ topicAreas: ["larps", "chess"] }, []);
    expect(!list.ok && list.field).toBe("topicAreas");
  });

  it("only takes known space options, deduped", () => {
    expect(parseGrade({ spaceOptions: [ROOM, ROOM] }, [ROOM])).toMatchObject({
      ok: true,
      value: { spaceLocationIds: [ROOM] },
    });
    const r = parseGrade({ spaceOptions: ["nowhere"] }, [ROOM]);
    expect(!r.ok && r.field).toBe("spaceOptions");
  });

  it("wants a whole, non-negative crowd size", () => {
    expect(parseGrade({ expectedCrowdSize: "40" }, [])).toMatchObject({
      ok: true,
      value: { grade: { expectedCrowdSize: 40 } },
    });
    expect(parseGrade({ expectedCrowdSize: -1 }, []).ok).toBe(false);
    expect(parseGrade({ expectedCrowdSize: 2.5 }, []).ok).toBe(false);
  });
});

describe("parseGrade strictness", () => {
  it("refuses keys that aren't grade fields", () => {
    expect(parseGrade({ fun: "good", phase: "deciding" }, [])).toEqual({
      ok: false,
      field: "phase",
      error: "Unknown field phase.",
    });
    expect(parseGrade({ graderEmail: "a@b.co" }, []).ok).toBe(true);
  });

  it("wants advance as a boolean", () => {
    expect(parseGrade({ advance: true }, [])).toMatchObject({
      ok: true,
      value: { advance: true },
    });
    expect(parseGrade({ advance: "1" }, []).ok).toBe(false);
  });

  it("takes space options as ids or as GET's {locationId}", () => {
    expect(
      parseGrade({ spaceOptions: [{ locationId: ROOM, name: "Rat Park" }] }, [
        ROOM,
      ]),
    ).toMatchObject({ ok: true, value: { spaceLocationIds: [ROOM] } });
  });

  it("caps the crowd size and refuses booleans", () => {
    expect(parseGrade({ expectedCrowdSize: 10000 }, []).ok).toBe(true);
    expect(parseGrade({ expectedCrowdSize: 10001 }, []).ok).toBe(false);
    expect(parseGrade({ expectedCrowdSize: true }, []).ok).toBe(false);
    for (const bad of ["1e3", "0x10", "-1", "4.5"]) {
      expect(parseGrade({ expectedCrowdSize: bad }, []).ok).toBe(false);
    }
    expect(parseGrade({ expectedCrowdSize: " 12 " }, [])).toMatchObject({
      ok: true,
      value: { grade: { expectedCrowdSize: 12 } },
    });
    expect(parseGrade({ expectedCrowdSize: " " }, [])).toMatchObject({
      ok: true,
      value: { grade: { expectedCrowdSize: null } },
    });
  });
});

describe("gradeBody", () => {
  it("round-trips a stored grade so a partial edit keeps the rest", () => {
    const stored = parseGrade(
      { fun: "best", topicAreas: ["larps"], spaceOptions: [ROOM] },
      [ROOM],
    );
    if (!stored.ok) throw new Error("setup");
    const merged = parseGrade(
      { ...gradeBody(stored.value.grade, [ROOM]), qualityNotes: "solid" },
      [ROOM],
    );
    expect(merged).toMatchObject({
      ok: true,
      value: {
        grade: { fun: "best", topicAreas: ["larps"], qualityNotes: "solid" },
        spaceLocationIds: [ROOM],
        session: {},
      },
    });
  });
});

describe("formToBody", () => {
  it("collects multi-selects and takes the first of anything else", () => {
    const form = new FormData();
    form.append("fun", "good");
    form.append("topicAreas", "");
    form.append("topicAreas", "larps");
    form.append("topicAreas", "ttrpgs");
    form.append("advance", "0");
    form.append("advance", "1");
    form.append("$ACTION_ID_abc", "");
    const r = parseGrade(formToBody(form), []);
    expect(r.ok && r.value.grade.fun).toBe("good");
    expect(r.ok && r.value.grade.topicAreas).toEqual(["larps", "ttrpgs"]);
    expect(r.ok && r.value.advance).toBe(true);
  });
});

describe("parseSessionText", () => {
  it("takes only the text columns given, blank as null", () => {
    const r = parseSessionText({ rickiNotes: "  ", context: "x", phase: "y" });
    expect(r.ok && r.value).toEqual({ rickiNotes: null, context: "x" });
    expect(parseSessionText({ context: 3 }).ok).toBe(false);
  });
});
