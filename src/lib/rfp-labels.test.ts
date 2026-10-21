import { describe, expect, it } from "vitest";
import { sessionPhase } from "@/db/schema";
import { NEXT_STEPS_PHASE, nextStepsFor } from "./rfp-labels";

const none = { graded: false, shepherded: false };

describe("nextStepsFor", () => {
  it("splits grading on whether anyone is grading it", () => {
    expect(nextStepsFor("grading", none)).toBe("0. Assign grader");
    expect(nextStepsFor("grading", { ...none, graded: true })).toBe("1. Grade");
  });

  it("splits shepherding on whether it has a shepherd", () => {
    expect(nextStepsFor("shepherding", none)).toBe("4. Assign shepherd");
    expect(nextStepsFor("shepherding", { ...none, shepherded: true })).toBe(
      "5. Shepherd meeting",
    );
  });

  it("keeps the trailing space on the done option", () => {
    expect(nextStepsFor("ready", none)).toBe("7. None! We're good :) ");
  });

  it("clears it with no phase", () => {
    expect(nextStepsFor(null, none)).toBeNull();
  });

  it("round-trips with the import's Next steps → phase map", () => {
    for (const phase of sessionPhase.enumValues) {
      for (const graded of [false, true]) {
        for (const shepherded of [false, true]) {
          const step = nextStepsFor(phase, { graded, shepherded });
          expect(step && NEXT_STEPS_PHASE[step]).toBe(phase);
        }
      }
    }
  });
});
