import { describe, expect, it } from "vitest";
import { myCounts, stepsOf, tabRows, TABS } from "./pipeline";
import type { Row } from "./SubmissionTable";
import { durationMinutes } from "@/lib/rfp-fields";

const row = (over: Partial<Row>): Row => ({
  id: "rec00000000000000",
  title: "A",
  host: "",
  grader: null,
  shepherd: null,
  verdict: null,
  nextSteps: null,
  ...over,
});

const tab = (key: string) => TABS.find((t) => t.key === key)!;

const rows = [
  row({ id: "1", nextSteps: null, grader: "Ana" }),
  row({ id: "2", nextSteps: "1. Grade", grader: "Ana", shepherd: "Bo" }),
  row({ id: "3", nextSteps: "1. Grade", grader: "Bo" }),
  row({ id: "4", nextSteps: "5. Shepherd meeting", shepherd: "Ana" }),
  row({ id: "5", nextSteps: "6. Add to schedule", shepherd: "Ana" }),
  row({ id: "6", nextSteps: "6. Add to schedule", shepherd: "Bo" }),
  row({ id: "7", nextSteps: "7. None! We're good :) ", shepherd: "Ana" }),
];
const ids = (rs: Row[]) => rs.map((r) => r.id);

describe("tabRows", () => {
  it("shows every row at the tab's step in All mode", () => {
    expect(ids(tabRows(rows, tab("grade"), "Ana", false))).toEqual(["2", "3"]);
    expect(ids(tabRows(rows, tab("unprocessed"), "Ana", false))).toEqual(["1"]);
    expect(ids(tabRows(rows, tab("all"), "Ana", false))).toHaveLength(7);
  });

  it("filters grading tabs by grader and shepherding tabs by shepherd", () => {
    expect(ids(tabRows(rows, tab("grade"), "Bo", true))).toEqual(["3"]);
    expect(ids(tabRows(rows, tab("schedule"), "Bo", true))).toEqual(["6"]);
    expect(ids(tabRows(rows, tab("shepherd-meeting"), "Ana", true))).toEqual([
      "4",
    ]);
  });

  it("treats either role as mine on All", () => {
    expect(ids(tabRows(rows, tab("all"), "Bo", true))).toEqual(["2", "3", "6"]);
  });

  it("matches nothing as mine without a name", () => {
    expect(tabRows(rows, tab("all"), null, true)).toEqual([]);
  });
});

describe("myCounts", () => {
  it("counts the viewer's rows per tab, leaving placed sessions out of Schedule", () => {
    const counts = myCounts(rows, "Ana");
    expect(counts.all).toBe(5);
    expect(counts.grade).toBe(1);
    expect(counts.schedule).toBe(1);
    expect(counts["assign-grader"]).toBe(0);
  });
});

describe("stepsOf", () => {
  it("orders untriaged first, then pipeline order, then unknown steps", () => {
    const steps = stepsOf([
      row({ nextSteps: "Mystery" }),
      row({ nextSteps: "1. Grade" }),
      row({ nextSteps: null }),
    ]);
    expect(steps).toEqual([null, "1. Grade", "Mystery"]);
  });
});

describe("durationMinutes", () => {
  it("books whole half hours ending on the passing period", () => {
    expect(durationMinutes("1 hour")).toBe(55);
    expect(durationMinutes("90 minutes")).toBe(85);
    expect(durationMinutes("1.5 hrs")).toBe(85);
    expect(durationMinutes("45 min")).toBe(55);
    expect(durationMinutes("2")).toBe(115);
    expect(durationMinutes("30")).toBe(25);
  });

  it("is null without a number", () => {
    expect(durationMinutes("depends")).toBeNull();
    expect(durationMinutes(undefined)).toBeNull();
  });
});
