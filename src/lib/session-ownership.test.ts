import { describe, expect, it } from "vitest";
import { sessionEditor } from "./session-ownership";

describe("sessionEditor", () => {
  it("lets a host of the session edit it", () => {
    expect(sessionEditor("ana", ["bo", "ana"], false)).toEqual({
      userId: "ana",
      via: "host",
    });
  });

  it("refuses someone who hosts a different session", () => {
    expect(sessionEditor("ana", ["bo"], false)).toBeNull();
  });

  it("lets the team edit a session they don't host", () => {
    expect(sessionEditor("ana", ["bo"], true)).toEqual({
      userId: "ana",
      via: "team",
    });
  });

  it("calls a host who is also team 'team'", () => {
    expect(sessionEditor("ana", ["ana"], true)).toEqual({
      userId: "ana",
      via: "team",
    });
  });

  it("refuses the signed out, even for a session with no hosts", () => {
    expect(sessionEditor(null, [], false)).toBeNull();
    expect(sessionEditor(null, [], true)).toBeNull();
  });

  it("refuses everyone on a hostless session", () => {
    expect(sessionEditor("ana", [], false)).toBeNull();
  });
});
