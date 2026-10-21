import { describe, expect, it } from "vitest";
import { myCounts, stepsOf, tabRows, TABS } from "./pipeline";
import { durationMinutes } from "@/lib/rfp-fields";
import type { Row } from "@/lib/rfp-pipeline";

const row = (over: Partial<Row>): Row => ({
  id: "00000000-0000-0000-0000-000000000000",
  title: "A",
  host: "",
  phase: null,
  grader: null,
  graderIds: [],
  shepherd: null,
  shepherdId: null,
  verdict: null,
  nextSteps: null,
  ...over,
});

const tab = (key: string) => TABS.find((t) => t.key === key)!;

const rows = [
  row({ id: "1", phase: null, graderIds: ["ana"] }),
  row({ id: "2", phase: "grading", graderIds: ["ana"], shepherdId: "bo" }),
  row({ id: "3", phase: "grading", graderIds: ["bo"] }),
  row({ id: "4", phase: "grading" }),
  row({ id: "5", phase: "shepherding", shepherdId: "ana" }),
  row({ id: "6", phase: "shepherding" }),
  row({ id: "7", phase: "scheduling", shepherdId: "ana" }),
  row({ id: "8", phase: "scheduling", shepherdId: "bo" }),
  row({ id: "9", phase: "ready", shepherdId: "ana" }),
];
const ids = (rs: Row[]) => rs.map((r) => r.id);

describe("tabRows", () => {
  it("splits grading and shepherding by whether anyone is assigned", () => {
    expect(ids(tabRows(rows, tab("unprocessed"), "ana", false))).toEqual(["1"]);
    expect(ids(tabRows(rows, tab("assign-grader"), "ana", false))).toEqual([
      "4",
    ]);
    expect(ids(tabRows(rows, tab("grade"), "ana", false))).toEqual(["2", "3"]);
    expect(ids(tabRows(rows, tab("assign-shepherd"), "ana", false))).toEqual([
      "6",
    ]);
    expect(ids(tabRows(rows, tab("shepherd-meeting"), "ana", false))).toEqual([
      "5",
    ]);
    expect(ids(tabRows(rows, tab("schedule"), "ana", false))).toEqual([
      "7",
      "8",
    ]);
    expect(ids(tabRows(rows, tab("all"), "ana", false))).toHaveLength(9);
  });

  it("filters grading tabs by grader and shepherding tabs by shepherd", () => {
    expect(ids(tabRows(rows, tab("grade"), "bo", true))).toEqual(["3"]);
    expect(ids(tabRows(rows, tab("schedule"), "bo", true))).toEqual(["8"]);
    expect(ids(tabRows(rows, tab("shepherd-meeting"), "ana", true))).toEqual([
      "5",
    ]);
  });

  it("treats either role as mine on All", () => {
    expect(ids(tabRows(rows, tab("all"), "bo", true))).toEqual(["2", "3", "8"]);
  });

  it("matches nothing as mine without an account", () => {
    expect(tabRows(rows, tab("all"), null, true)).toEqual([]);
  });
});

describe("myCounts", () => {
  it("counts the viewer's rows per tab, leaving placed sessions out of Schedule", () => {
    const counts = myCounts(rows, "ana");
    expect(counts.all).toBe(5);
    expect(counts.grade).toBe(1);
    expect(counts.schedule).toBe(1);
    expect(counts["assign-grader"]).toBe(0);
  });
});

describe("stepsOf", () => {
  it("orders untriaged first, then pipeline order", () => {
    const steps = stepsOf([
      row({ nextSteps: "6. Add to schedule" }),
      row({ nextSteps: "1. Grade" }),
      row({ nextSteps: null }),
    ]);
    expect(steps).toEqual([null, "1. Grade", "6. Add to schedule"]);
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
