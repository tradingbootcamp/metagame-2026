import { describe, expect, it } from "vitest";
import { fillCells, typedChars } from "./pin-cells";
import { normalizeTicketCode } from "@/lib/ticket-code-format";

const empty = Array.from({ length: 6 }, () => "");

describe("fillCells", () => {
  it("spreads a pasted code across every box", () => {
    expect(fillCells(empty, 0, normalizeTicketCode("a2c-4ef"))).toEqual({
      cells: ["A", "2", "C", "4", "E", "F"],
      focus: 6,
    });
  });

  it("fills from the box pasted into and drops overflow", () => {
    expect(fillCells(empty, 4, "ABCD")).toEqual({
      cells: ["", "", "", "", "A", "B"],
      focus: 6,
    });
  });

  it("advances one box per typed char", () => {
    expect(fillCells(empty, 2, "X")).toEqual({
      cells: ["", "", "X", "", "", ""],
      focus: 3,
    });
  });
});

describe("typedChars", () => {
  it("keeps only the new keystroke when typing over a filled box", () => {
    expect(typedChars("A", "AB")).toBe("B");
    expect(typedChars("A", "BA")).toBe("B");
  });

  it("passes pastes and autofill through", () => {
    expect(typedChars("", "A2C4EF")).toBe("A2C4EF");
    expect(typedChars("A", "A2C4EF")).toBe("A2C4EF");
  });
});
