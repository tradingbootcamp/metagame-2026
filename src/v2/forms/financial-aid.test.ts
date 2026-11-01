import { describe, expect, it } from "vitest";
import { SCHEDULE_KEYS } from "@/v2/components/journey/ScheduleBoard";
import { TEAM_KEYS } from "@/v2/components/journey/TeamBoard";
import { checkForm, visibleItems, visibleSteps } from "./engine";
import { FORMS } from "./index";

describe("financial aid", () => {
  const def = FORMS["financial-aid"];
  const steps = (a: Record<string, unknown>) =>
    visibleSteps(def, a as never).map((s) => s.key);

  it("asks about the ticket and the price together, so the instant approval shows as they answer", () => {
    const price = def.steps.find((s) => s.key === "price")!;
    const keys = price.items.map((i) => i.key);
    expect(keys.indexOf("ticket")).toBeLessThan(keys.indexOf("price"));
    expect(
      visibleItems(price, {
        ticket: "No",
        price: "$100 off (ticket price: $325)",
      }).map((i) => i.key),
    ).toContain("approved");
  });

  it("gives volunteers the calendar and the team list, and skips them otherwise", () => {
    expect(steps({ volunteer: "Yes" })).toEqual([
      "you",
      "price",
      "volunteer",
      "shifts",
      "teams",
      "skills",
      "more",
    ]);
    expect(steps({ volunteer: "No" })).toEqual([
      "you",
      "price",
      "volunteer",
      "more",
    ]);
    expect(steps({})).toEqual(steps({ volunteer: "No" }));
    const view = (key: string) => def.steps.find((s) => s.key === key)!;
    expect(view("shifts").view).toBe("schedule");
    expect(view("shifts").items.map((i) => i.key)).toEqual(
      expect.arrayContaining(SCHEDULE_KEYS),
    );
    expect(view("teams").view).toBe("teams");
    expect(view("teams").items.map((i) => i.key)).toEqual(
      expect.arrayContaining(TEAM_KEYS),
    );
  });

  it("needs an answer on volunteering, since it decides the rest of the form", () => {
    expect(checkForm(def, {})).toHaveProperty("volunteer");
  });
});
