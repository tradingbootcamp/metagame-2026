import { afterEach, describe, expect, it, vi } from "vitest";
import type { GradeValues } from "./grade-input";
import type { MirrorState } from "./rfp-sessions";
import {
  committeeField,
  gradeFields,
  mirror,
  nextStepsField,
  sessionFields,
} from "./rfp-mirror";

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

describe("committeeField", () => {
  it("names the account as the select does", () => {
    expect(committeeField("Shepherd", "jbromels@gmail.com")).toEqual({
      Shepherd: "John Bromels",
    });
  });

  it("clears the shepherd but marks the grader Unassigned", () => {
    expect(committeeField("Shepherd", null)).toEqual({ Shepherd: null });
    expect(committeeField("Rubric: Grader", null)).toEqual({
      "Rubric: Grader": "Unassigned",
    });
  });

  it("skips an account Airtable has no option for", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(committeeField("Shepherd", "new@example.com")).toBeNull();
  });
});

describe("nextStepsField", () => {
  const state: MirrorState = {
    recordId: "recAAAAAAAAAAAAAA",
    phase: "grading",
    verdict: null,
    graded: false,
    shepherdEmail: null,
    graderEmail: null,
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
});
