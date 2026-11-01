import { describe, expect, it } from "vitest";
import { airtableFields, checkForm } from "./engine";
import { FORMS } from "./index";

describe("children", () => {
  const def = FORMS.children;
  const base = {
    name: "Pat",
    email: "pat@example.com",
    phone: "510 555 0100",
    count: "1",
    child1Name: "Sam",
    child1Age: "6",
  };

  it("keeps other childcare times with the child's notes", () => {
    const a = {
      ...base,
      child1Times: ["Other"],
      child1OtherTimes: "Thursday evening, if there is any",
    };
    expect(checkForm(def, a)).toEqual({});
    const fields = airtableFields(def, a);
    expect(fields.fldsPPUcLgY1gamSP).toEqual(["Other"]);
    expect(fields.fldqVRzRJmUnQQ8Jl).toBe(
      "Other times: Thursday evening, if there is any",
    );
  });

  it("puts those times after whatever else was said about the child", () => {
    const fields = airtableFields(def, {
      ...base,
      child1Times: ["Other"],
      child1OtherTimes: "Thursday",
      child1Other: "Shy at first.",
    });
    expect(fields.fldqVRzRJmUnQQ8Jl).toBe(
      "Shy at first.\n\nOther times: Thursday",
    );
  });

  it("doesn't need a Discord handle or a relationship", () => {
    expect(checkForm(def, base)).toEqual({});
  });
});
