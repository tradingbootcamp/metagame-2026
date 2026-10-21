import { afterEach, describe, expect, it, vi } from "vitest";
import type { GradeValues } from "./grade-input";
import type { MirrorState } from "./rfp-sessions";
import {
  gradeFields,
  graderField,
  mirror,
  nextStepsField,
  sessionFields,
  shepherdWrite,
} from "./rfp-mirror";

vi.mock("@/env", () => ({ env: { AIRTABLE_API_KEY: "test" } }));

const grade: GradeValues = {
  operationalEase: "good",
  hostCompetence: null,
  hostNameRecognition: null,
  subjectMatter: null,
  fun: "best",
  verdictRecommendation: "confirmed",
  qualityNotes: null,
  schedulerNotes: "needs a projector",
  shepherdMatch: "neutral",
  topicAreas: ["word_puzzles"],
  potentialPanels: [],
  megagameIntegration: null,
  expectedCrowdSize: 30,
  allowDropins: "welcome",
};

describe("gradeFields", () => {
  it("writes labels, and blanks the cells a grade leaves empty", () => {
    expect(gradeFields(grade, ["Gyroscope", "Not a space option"])).toEqual({
      "Rubric: Operational Ease": "Good",
      "Rubric: Host Competence": null,
      "Rubric: Host Name Recognition": null,
      "Rubric: Subject Matter": null,
      "Rubric: Fun": "Best",
      "Grader Verdict recomendation": "Confirm",
      "Grader notes on quality": "",
      "Grader Notes for Scheduler": "needs a projector",
      "Shepherd match potential":
        "Neutral: I'm willing and able to be their Shepherd if needed",
      "Topic areas": ["Word puzzles (e.g. crosswords)"],
      "Potential Panels": [],
      "Lighthaven Space Options": ["2E1 Gyroscope (E, 2nd floor, Max 30)"],
      "Megagame integration": "",
      "Expected crowd size": 30,
      "Allow dropins?": "Dropins welcome",
    });
  });
});

describe("graderField", () => {
  it("names a committee member as the select does", () => {
    expect(graderField({ email: "jbromels@gmail.com" })).toEqual({
      "Rubric: Grader": "John Bromels",
    });
  });

  it("writes Other for anyone the Grader select doesn't list", () => {
    expect(graderField({ email: "ja.kopczynski@gmail.com" })).toEqual({
      "Rubric: Grader": "Other",
    });
    expect(graderField({ email: "new@example.com" })).toEqual({
      "Rubric: Grader": "Other",
    });
  });

  it("marks nobody Unassigned", () => {
    expect(graderField(null)).toEqual({ "Rubric: Grader": "Unassigned" });
  });
});

describe("shepherdWrite", () => {
  it("uses the committee name, else the display name, with typecast on", () => {
    expect(
      shepherdWrite({ email: "jbromels@gmail.com", name: "John" }),
    ).toEqual({ fields: { Shepherd: "John Bromels" }, typecast: true });
    expect(shepherdWrite({ email: "new@example.com", name: "Pat" })).toEqual({
      fields: { Shepherd: "Pat" },
      typecast: true,
    });
    expect(shepherdWrite(null).fields).toEqual({ Shepherd: null });
  });
});

describe("nextStepsField", () => {
  const state: MirrorState = {
    recordId: "recAAAAAAAAAAAAAA",
    phase: "grading",
    verdict: null,
    graded: false,
    shepherd: null,
    grader: null,
  };
  it("reads the grade rows and shepherd off the state", () => {
    expect(nextStepsField(state)).toEqual({ "Next steps": "0. Assign grader" });
    expect(nextStepsField({ ...state, graded: true })).toEqual({
      "Next steps": "1. Grade",
    });
  });
});

describe("sessionFields", () => {
  it("maps only the columns given", () => {
    expect(
      sessionFields({ rickiNotes: null, ticketState: "comp", cohosts: "Ann" }),
    ).toEqual({
      "Ricki's notes": "",
      "Ticket state": "comp",
      "Cohost(s)": "Ann",
    });
    expect(sessionFields({}, "free_ticket")).toEqual({
      "Speaker tier": "Free ticket",
    });
  });
});

describe("mirror", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("doesn't touch Airtable outside production", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "info").mockImplementation(() => {});
    mirror("recAAAAAAAAAAAAAA", { Verdict: "Confirmed" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends plain fields with typecast off and a Write as given", async () => {
    vi.stubEnv("RFP_AIRTABLE_MIRROR", "1");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));
    mirror(
      "recAAAAAAAAAAAAAA",
      { Verdict: "Confirmed" },
      null,
      {},
      shepherdWrite({ email: "new@example.com", name: "Pat" }),
    );
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const bodies = fetchSpy.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    );
    expect(bodies).toEqual([
      { fields: { Verdict: "Confirmed" }, typecast: false },
      { fields: { Shepherd: "Pat" }, typecast: true },
    ]);
  });
});
