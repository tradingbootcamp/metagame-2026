import { describe, expect, it, vi } from "vitest";

// Only the error formatting is under test here, so the Drizzle client and the
// schema it reads at import time are stood in for.
vi.mock("@/db", () => {
  const anything: unknown = new Proxy(() => anything, { get: () => anything });
  return { getDb: () => anything, schema: anything };
});

const { constraintMessage, explainDbError } = await import("./schedule-store");

describe("constraintMessage", () => {
  // The attendee-facing note writes answer with this and a fixed string, so a
  // driver message ("invalid input syntax for type uuid") never reaches a
  // client. explainDbError's fallback is for the team-facing forms only.
  it("says nothing about an error that names no constraint", () => {
    expect(constraintMessage(new Error("invalid input syntax for uuid"))).toBe(
      null,
    );
    expect(constraintMessage("connection reset")).toBe(null);
    expect(explainDbError(new Error("invalid input syntax for uuid"))).toEqual({
      error: "invalid input syntax for uuid",
    });
  });

  it("reads a constraint through the error's causes", () => {
    const err = Object.assign(new Error("insert failed"), {
      cause: { constraint: "unconference_notes_body_length" },
    });
    expect(constraintMessage(err)).toEqual({
      field: "body",
      error: "A note needs some text, and under 1000 characters of it.",
    });
    expect(explainDbError(err)).toEqual(constraintMessage(err));
  });
});
