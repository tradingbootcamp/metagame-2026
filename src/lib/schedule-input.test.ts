import { describe, expect, it } from "vitest";
import {
  parseLocationFields,
  parseSessionFields,
  type Parsed,
} from "./schedule-input";

/** The field an invalid parse blames, or null when it passed. */
const blamed = (parsed: Parsed<unknown>) => (parsed.ok ? null : parsed.field);

describe("parseSessionFields", () => {
  it("accepts a placed session from JSON, with numbers as numbers", () => {
    const parsed = parseSessionFields({
      title: "Giant chess",
      startsAt: "2026-11-06T18:30",
      endsAt: "2026-11-06T19:55",
      maxCapacity: 20,
      status: "published",
      category: "game",
      ages: "kids",
    });
    if (!parsed.ok) throw new Error(parsed.error);
    const v = parsed.value;
    expect(v.slug).toBe("giant-chess");
    // 18:30 PST is 02:30 UTC the next day.
    expect(v.startsAt?.toISOString()).toBe("2026-11-07T02:30:00.000Z");
    expect(v.endsAt?.toISOString()).toBe("2026-11-07T03:55:00.000Z");
    expect(v.maxCapacity).toBe(20);
    expect(v.minCapacity).toBeNull();
    expect(v.status).toBe("published");
    expect(v.category).toBe("game");
    expect(v.ages).toBe("kids");
    expect(v.locationId).toBeNull();
  });

  it("accepts the form's strings, blank meaning null", () => {
    const parsed = parseSessionFields({
      title: " Draft ",
      slug: "",
      startsAt: "",
      endsAt: "",
      maxCapacity: "",
      minCapacity: "3",
      status: "",
      category: "",
      description: "  ",
    });
    expect(parsed).toMatchObject({
      ok: true,
      value: {
        title: "Draft",
        slug: "draft",
        startsAt: null,
        endsAt: null,
        maxCapacity: null,
        minCapacity: 3,
        status: "draft",
        category: null,
        description: null,
      },
    });
  });

  it("names the field at fault", () => {
    expect(parseSessionFields({})).toEqual({
      ok: false,
      field: "title",
      error: "Required.",
    });
    const x = { title: "x" };
    expect(blamed(parseSessionFields({ ...x, startsAt: "soon" }))).toBe(
      "startsAt",
    );
    expect(
      blamed(parseSessionFields({ ...x, startsAt: "2026-11-06T18:30" })),
    ).toBe("endsAt");
    expect(
      parseSessionFields({
        ...x,
        startsAt: "2026-11-06T18:30",
        endsAt: "2026-11-06T18:30",
      }),
    ).toMatchObject({ ok: false, error: "End must be after start." });
    expect(blamed(parseSessionFields({ ...x, maxCapacity: 1.5 }))).toBe(
      "maxCapacity",
    );
    expect(blamed(parseSessionFields({ ...x, minCapacity: "ten" }))).toBe(
      "minCapacity",
    );
    expect(parseSessionFields({ ...x, status: "published" })).toEqual({
      ok: false,
      field: "status",
      error: "A published session needs a start and end time.",
    });
    expect(blamed(parseSessionFields({ ...x, status: "live" }))).toBe("status");
    expect(blamed(parseSessionFields({ ...x, category: "panel" }))).toBe(
      "category",
    );
    expect(blamed(parseSessionFields({ ...x, ages: "teens" }))).toBe("ages");
  });
});

describe("parseLocationFields", () => {
  it("reads each visibility level, defaulting to hidden", () => {
    expect(
      parseLocationFields({ name: "Hall", visibility: "public" }),
    ).toMatchObject({ value: { visibility: "public", displayOrder: 100 } });
    expect(
      parseLocationFields({ name: "Hall", visibility: "volunteer" }),
    ).toMatchObject({ value: { visibility: "volunteer" } });
    expect(parseLocationFields({ name: "Hall" })).toMatchObject({
      value: { visibility: "hidden" },
    });
  });

  it("rejects a missing name, non-integers and an unknown level", () => {
    expect(blamed(parseLocationFields({}))).toBe("name");
    expect(blamed(parseLocationFields({ name: "Hall", capacity: "big" }))).toBe(
      "capacity",
    );
    expect(
      blamed(parseLocationFields({ name: "Hall", displayOrder: "first" })),
    ).toBe("displayOrder");
    expect(
      blamed(parseLocationFields({ name: "Hall", visibility: "on" })),
    ).toBe("visibility");
  });
});

describe("airtableRfpRecordId", () => {
  const base = { title: "Chess" };
  it("is left as stored when not mentioned", () => {
    const r = parseSessionFields(base);
    expect(r.ok && r.value.airtableRfpRecordId).toBeUndefined();
  });
  it("takes a record id, or null to clear", () => {
    const r = parseSessionFields({
      ...base,
      airtableRfpRecordId: "rec0M8Nq1mc3qApko",
    });
    expect(r.ok && r.value.airtableRfpRecordId).toBe("rec0M8Nq1mc3qApko");
    const cleared = parseSessionFields({ ...base, airtableRfpRecordId: null });
    expect(cleared.ok && cleared.value.airtableRfpRecordId).toBeNull();
  });
  it("rejects anything else", () => {
    const r = parseSessionFields({ ...base, airtableRfpRecordId: "row 12" });
    expect(!r.ok && r.field).toBe("airtableRfpRecordId");
  });
});

describe("shepherdUserId", () => {
  const base = { title: "Chess" };
  it("is left as stored when not mentioned", () => {
    const r = parseSessionFields(base);
    expect(r.ok && r.value.shepherdUserId).toBeUndefined();
  });
  it("takes a user id, with blank or null clearing it", () => {
    const r = parseSessionFields({ ...base, shepherdUserId: " u_123 " });
    expect(r.ok && r.value.shepherdUserId).toBe("u_123");
    for (const shepherdUserId of [null, ""]) {
      const cleared = parseSessionFields({ ...base, shepherdUserId });
      expect(cleared.ok && cleared.value.shepherdUserId).toBeNull();
    }
  });
  it("rejects a non-string", () => {
    const r = parseSessionFields({ ...base, shepherdUserId: { id: 1 } });
    expect(!r.ok && r.field).toBe("shepherd");
  });
});
