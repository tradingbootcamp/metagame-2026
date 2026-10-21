import { describe, expect, it } from "vitest";
import { fillOnly, mapRfpRecord } from "./rfp-intake";

const fresh = {
  Title: "  Designing Hidden-Role Games ",
  Description: "A hands-on workshop.",
  Category: ["Workshop", "Board game"],
  Age: ["Adults only (18+)", "Other"],
  "Minimum size": 4,
  "Maximum size": 24,
  "Space needs": "Tables",
  Duration: "90 min",
  "Session Context": "I ran this at Gen Con.",
  "Cohost(s)": "Sam",
  "Timing constraints": "Not Sunday",
  "Interest level in tying this proposal to the Megagame?": "Willing",
  "Session marketing consent": true,
  Host: "Alex Doe",
  "Email (host)": " Alex@Example.com ",
  "Discord (host)": "@alexdoe",
  "Link (host)": "https://alex.example",
};

describe("mapRfpRecord", () => {
  it("maps a fresh submission", () => {
    const { values, host, warnings } = mapRfpRecord(fresh);
    expect(warnings).toEqual([]);
    expect(values).toMatchObject({
      title: "Designing Hidden-Role Games",
      category: "workshop",
      ages: "adults",
      minCapacity: 4,
      maxCapacity: 24,
      needs: "Tables",
      phase: "grading",
      verdict: null,
      requestedDuration: "90 min",
      context: "I ran this at Gen Con.",
      megagameInterest: "willing",
      marketingConsent: true,
      anythingElse: null,
    });
    expect(host).toEqual({
      email: "alex@example.com",
      name: "Alex Doe",
      discord: "alexdoe",
      website: "https://alex.example",
    });
  });

  it("collapses categories and ages like the import", () => {
    const map = (Category: string[], Age: string[]) =>
      mapRfpRecord({ Category, Age }).values;
    expect(map(["Panel", "Board game"], ["Other"])).toMatchObject({
      category: "talk",
      ages: null,
    });
    expect(map(["Other"], ["Primarily for children"])).toMatchObject({
      category: "other",
      ages: "kids",
    });
    expect(
      map(["LARP"], ["Appropriate for all ages", "Adults only (18+)"]),
    ).toMatchObject({ category: "game", ages: null });
    expect(map([], [])).toMatchObject({ category: null, ages: null });
  });

  it("drops capacities the check constraints would refuse", () => {
    const caps = (min: number, max: number) =>
      mapRfpRecord({ "Minimum size": min, "Maximum size": max }).values;
    expect(caps(30, 10)).toMatchObject({ minCapacity: null, maxCapacity: 10 });
    expect(caps(-1, 0)).toMatchObject({ minCapacity: null, maxCapacity: null });
    expect(caps(2.6, 8)).toMatchObject({ minCapacity: 3, maxCapacity: 8 });
  });

  it("reports unknown labels and leaves their columns null", () => {
    const { values, warnings } = mapRfpRecord({
      ...fresh,
      "Next steps": "8. Celebrate",
      Verdict: "Confirmed",
      "Speaker tier": "Gold tier",
      "Discord?": "Not yet",
    });
    expect(values).toMatchObject({
      phase: null,
      verdict: "confirmed",
      speakerTier: null,
      discordStatus: "not_yet",
    });
    expect(warnings).toEqual([
      'Next steps: unknown option "8. Celebrate"',
      'Speaker tier: unknown option "Gold tier"',
    ]);
  });

  it("takes the phase from Next steps", () => {
    expect(
      mapRfpRecord({ "Next steps": "2. Committee decision" }).values.phase,
    ).toBe("deciding");
  });

  it("names an untitled proposal", () => {
    const { values, host } = mapRfpRecord({});
    expect(values.title).toBe("Untitled proposal");
    expect(values.marketingConsent).toBe(false);
    expect(host.email).toBeNull();
  });
});

describe("fillOnly", () => {
  const { values } = mapRfpRecord(fresh);
  const blank = Object.fromEntries(
    Object.keys(values).map((k) => [k, null]),
  ) as Partial<typeof values>;

  it("fills only null columns", () => {
    const patch = fillOnly(
      { ...blank, description: "Edited in the app", phase: "deciding" },
      values,
    );
    expect(patch).not.toHaveProperty("description");
    expect(patch).not.toHaveProperty("phase");
    expect(patch).not.toHaveProperty("title");
    expect(patch).not.toHaveProperty("verdict");
    expect(patch).toMatchObject({
      needs: "Tables",
      category: "workshop",
      minCapacity: 4,
      maxCapacity: 24,
    });
  });

  it("returns nothing when every column is set", () => {
    expect(fillOnly({ ...values, title: "Renamed" }, values)).toEqual({});
  });

  it("keeps capacities ordered against what's stored", () => {
    expect(fillOnly({ ...blank, minCapacity: 30 }, values)).not.toHaveProperty(
      "maxCapacity",
    );
    expect(fillOnly({ ...blank, maxCapacity: 3 }, values)).not.toHaveProperty(
      "minCapacity",
    );
    expect(fillOnly({ ...blank, maxCapacity: 10 }, values)).toMatchObject({
      minCapacity: 4,
    });
  });
});
