import { describe, expect, it } from "vitest";
import {
  committeeMember,
  namedGrader,
  parseRfpSessionPatch,
  parseRfpSessionQuery,
} from "./rfp-sessions-api";

const query = (s: string) => parseRfpSessionQuery(new URLSearchParams(s));

describe("parseRfpSessionQuery", () => {
  it("takes comma-separated and repeated values, none as unset", () => {
    expect(query("phase=grading,deciding&phase=none&verdict=na")).toEqual({
      ok: true,
      value: {
        phases: ["grading", "deciding", null],
        verdicts: ["na"],
      },
    });
  });

  it("passes grader and shepherd through for the route to resolve", () => {
    expect(query("grader=a@b.co&shepherd=u1")).toMatchObject({
      ok: true,
      value: { grader: "a@b.co", shepherd: "u1" },
    });
  });

  it("refuses an unknown phase", () => {
    const r = query("phase=graded");
    expect(!r.ok && r.field).toBe("phase");
  });
});

describe("parseRfpSessionPatch", () => {
  it("only carries the keys sent", () => {
    expect(parseRfpSessionPatch({ verdict: "probably" })).toEqual({
      ok: true,
      value: { verdict: "probably", text: {} },
    });
  });

  it("clears with null, including the shepherd", () => {
    expect(
      parseRfpSessionPatch({
        phase: null,
        shepherdEmail: null,
        rickiNotes: "",
      }),
    ).toEqual({
      ok: true,
      value: { phase: null, shepherd: null, text: { rickiNotes: null } },
    });
  });

  it("refuses bad values with the field", () => {
    const r = parseRfpSessionPatch({ speakerTier: "gold" });
    expect(!r.ok && r.field).toBe("speakerTier");
    const s = parseRfpSessionPatch({ shepherdUserId: 4 });
    expect(!s.ok && s.field).toBe("shepherdUserId");
  });
});

describe("namedGrader", () => {
  it("is undefined unless a grader is named", () => {
    expect(namedGrader({})).toEqual({ ok: true, value: undefined });
    expect(namedGrader({ graderEmail: " x@y.z " })).toEqual({
      ok: true,
      value: "x@y.z",
    });
    expect(namedGrader({ graderUserId: "" }).ok).toBe(false);
  });
});

describe("parseRfpSessionPatch strictness", () => {
  it("refuses unknown keys and a shepherd object", () => {
    expect(parseRfpSessionPatch({ title: "x" })).toEqual({
      ok: false,
      field: "title",
      error: "Unknown field title.",
    });
    const r = parseRfpSessionPatch({ shepherd: { email: "a@b.co" } });
    expect(!r.ok && r.error).toMatch(/shepherdEmail/);
  });

  it("refuses a blank shepherd and both an id and an email", () => {
    expect(parseRfpSessionPatch({ shepherdEmail: " " }).ok).toBe(false);
    expect(
      parseRfpSessionPatch({ shepherdEmail: "a@b.co", shepherdUserId: "u" }).ok,
    ).toBe(false);
  });

  it("refuses both grader keys too", () => {
    expect(namedGrader({ graderEmail: "a@b.co", graderUserId: "u" }).ok).toBe(
      false,
    );
  });
});

describe("committeeMember", () => {
  const committee = [{ userId: "u1", email: "Ben@Metagame.games" }];
  it("matches by user id or email, case-insensitively", () => {
    expect(committeeMember(committee, "u1")).toBe(committee[0]);
    expect(committeeMember(committee, "ben@metagame.games")).toBe(committee[0]);
    expect(committeeMember(committee, "someone@else.com")).toBeNull();
  });
});
