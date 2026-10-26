import { describe, expect, it } from "vitest";
import {
  confidenceFromProbability,
  jevCategoryQuestions,
  jevParentQuestions,
  jevVerdict,
  parseModelList,
  providerOf,
  tallyPicks,
  type VerdictRow,
} from "./budget-verdicts";
import type { Category, LedgerRow } from "./budget-ledger";

const categories: Category[] = [
  { type: "Income", group: "Revenue", name: "Sponsors", budget: 40500 },
  { type: "Expense", group: "Core team", name: "Staff travel", budget: 3250 },
  { type: "Expense", group: "Core team", name: "Staff cars", budget: 1800 },
];

const plan = (over: Partial<LedgerRow>): LedgerRow => ({
  row: 2,
  id: "T020",
  item: "Yemima travel",
  parent: "",
  category: "Staff travel",
  group: "Core team",
  type: "Expense",
  phase: "Event",
  counterparty: "Yemima",
  budgeted: 500,
  actual: null,
  forecast: 500,
  remaining: 500,
  status: "Planned",
  date: null,
  notes: "",
  xeroId: "",
  xeroDescription: "",
  flags: "",
  proposal: "",
  ...over,
});

describe("budget verdicts", () => {
  it("parses the model list and routes by prefix", () => {
    expect(parseModelList(" claude-opus-5-5, jev-latest ,,")).toEqual([
      "claude-opus-5-5",
      "jev-latest",
    ]);
    expect(parseModelList(undefined)).toEqual([]);
    expect(providerOf("claude-haiku-5-5")).toBe("anthropic");
    expect(providerOf("jev-latest")).toBe("typesafe");
    expect(providerOf("typesafe/jev-1.14.0")).toBe("typesafe");
  });

  it("maps probabilities onto the ledger's confidence words", () => {
    expect(confidenceFromProbability(0.9)).toBe("high");
    expect(confidenceFromProbability(0.6)).toBe("medium");
    expect(confidenceFromProbability(0.2)).toBe("low");
  });

  it("asks Jev only about categories of the line's type", () => {
    const expense = jevCategoryQuestions(categories, false);
    expect(Object.keys(expense.category.criteria)).toEqual([
      "Staff travel",
      "Staff cars",
    ]);
    expect(Object.keys(expense.phase.criteria)).toEqual([
      "Pre",
      "Event",
      "Post",
    ]);
    const income = jevCategoryQuestions(categories, true);
    expect(Object.keys(income.category.criteria)).toEqual(["Sponsors"]);
  });

  it("offers none plus each plan row as parent choices", () => {
    const q = jevParentQuestions([
      plan({}),
      plan({ id: "T017", item: "Sparr" }),
    ]);
    expect(Object.keys(q.parent.criteria)).toEqual(["none", "T020", "T017"]);
  });

  it("turns Jev answers into a verdict with the line's own names", () => {
    const v = jevVerdict(
      { description: "Yemima flights", contact: "Delta", account: "Flights" },
      {
        category: {
          type: "choice",
          choice: "Staff travel",
          probabilities: { "Staff travel": 0.82, "Staff cars": 0.18 },
        },
        phase: { type: "choice", choice: "Event", confidence: 0.7 },
        parent: {
          type: "choice",
          choice: "T020",
          probabilities: { none: 0.3, T020: 0.7 },
        },
      },
      "jev-1.14.0",
    );
    expect(v).toMatchObject({
      item: "Yemima flights",
      category: "Staff travel",
      parent: "T020",
      phase: "Event",
      counterparty: "Delta",
      confidence: "high",
    });
    expect(v.reason).toContain("category 0.82");
    expect(v.reason).toContain("parent 0.70");
  });

  it("treats none and unknown phases as blanks", () => {
    const v = jevVerdict(
      { description: "", contact: "Uber", account: "Rideshare" },
      {
        category: { type: "choice", choice: "Staff cars", confidence: 0.4 },
        phase: { type: "choice", choice: "Whenever" },
        parent: { type: "choice", choice: "none" },
      },
      "jev-latest",
    );
    expect(v.item).toBe("Uber");
    expect(v.parent).toBeNull();
    expect(v.phase).toBe("");
    expect(v.confidence).toBe("low");
  });

  it("tallies picks, errors and tokens per model", () => {
    const row = (over: Partial<VerdictRow>): VerdictRow => ({
      xeroId: "a",
      model: "claude-opus-5-5",
      verdict: null,
      error: null,
      inputTokens: 100,
      outputTokens: 10,
      latencyMs: 1000,
      picked: false,
      ...over,
    });
    const tally = tallyPicks([
      row({ picked: true }),
      row({ xeroId: "b" }),
      row({ model: "jev-latest", inputTokens: 5, outputTokens: 0 }),
      row({ model: "jev-latest", xeroId: "b", picked: true, error: null }),
      row({ model: "jev-latest", xeroId: "c", error: "429" }),
    ]);
    expect(tally).toEqual([
      {
        model: "jev-latest",
        verdicts: 3,
        picked: 1,
        errors: 1,
        inputTokens: 205,
        outputTokens: 20,
      },
      {
        model: "claude-opus-5-5",
        verdicts: 2,
        picked: 1,
        errors: 0,
        inputTokens: 200,
        outputTokens: 20,
      },
    ]);
  });
});
