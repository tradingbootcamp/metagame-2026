import { describe, expect, it } from "vitest";
import { attributedGrader, nextStepsMayChange } from "./rfp-sessions";

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 1, 0, minutes));
const grade = (
  name: string,
  created: number,
  updated: number,
  submitted: boolean,
) => ({
  name,
  createdAt: at(created),
  updatedAt: at(updated),
  submittedAt: submitted ? at(updated) : null,
});

describe("attributedGrader", () => {
  it("is the most recently saved submitted grade", () => {
    const grades = [
      grade("early, edited late", 0, 30, true),
      grade("later, untouched", 10, 10, true),
      grade("newest assignment", 40, 40, false),
    ];
    expect(attributedGrader(grades)?.name).toBe("early, edited late");
  });

  it("falls back to the latest assignment when nothing is submitted", () => {
    const grades = [grade("first", 0, 0, false), grade("second", 5, 5, false)];
    expect(attributedGrader(grades)?.name).toBe("second");
  });

  it("is null with no grades", () => {
    expect(attributedGrader([])).toBeNull();
  });
});

describe("nextStepsMayChange", () => {
  it("follows a grade save only when it advances", () => {
    expect(nextStepsMayChange({ kind: "grade", advance: false })).toBe(false);
    expect(nextStepsMayChange({ kind: "grade", advance: true })).toBe(true);
  });

  it("follows an assignment only while grading", () => {
    expect(nextStepsMayChange({ kind: "assignment", phase: "grading" })).toBe(
      true,
    );
    expect(
      nextStepsMayChange({ kind: "assignment", phase: "shepherding" }),
    ).toBe(false);
  });

  it("follows an update of the phase, or of the shepherd while shepherding", () => {
    const update = (u: object, phase: "deciding" | "shepherding") =>
      nextStepsMayChange({ kind: "update", update: u, phase });
    expect(update({ phase: "deciding" }, "deciding")).toBe(true);
    expect(update({ verdict: "probably" }, "shepherding")).toBe(false);
    expect(update({ shepherdUserId: "u1" }, "shepherding")).toBe(true);
    expect(update({ shepherdUserId: "u1" }, "deciding")).toBe(false);
  });
});
