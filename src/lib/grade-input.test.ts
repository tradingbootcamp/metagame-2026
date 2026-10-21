import { describe, expect, it } from "vitest";
import { formToBody, parseGrade, parseSessionText } from "./grade-input";

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

describe("formToBody", () => {
  it("collects multi-selects and takes the first of anything else", () => {
    const form = new FormData();
    form.append("fun", "good");
    form.append("topicAreas", "");
    form.append("topicAreas", "larps");
    form.append("topicAreas", "ttrpgs");
    form.append("advance", "1");
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
