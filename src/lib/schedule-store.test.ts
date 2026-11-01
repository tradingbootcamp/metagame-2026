import { describe, expect, it, vi } from "vitest";

// Only the error formatting is under test here, so the Drizzle client and the
// schema it reads at import time are stood in for.
vi.mock("@/db", () => {
  const anything: unknown = new Proxy(() => anything, { get: () => anything });
  return { getDb: () => anything, schema: anything };
});

const { constraintMessage, explainDbError, OccupiedBoardError } =
  await import("./schedule-store");

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

describe("OccupiedBoardError", () => {
  // Turning an occupied room into a board would leave its sessions listed and
  // searchable but drawn nowhere — the same hole BoardRoomError closes from
  // the session side, so the room side has to refuse it too.
  it("blames the layout field, so the form marks the right control", () => {
    expect(new OccupiedBoardError(3).field).toBe("layout");
  });

  it("counts what is in the way, and reads correctly for one", () => {
    expect(new OccupiedBoardError(1).message).toBe(
      "1 session is still in this room. Move it before drawing it as a bulletin board.",
    );
    expect(new OccupiedBoardError(4).message).toBe(
      "4 sessions are still in this room. Move them before drawing it as a bulletin board.",
    );
  });
});
