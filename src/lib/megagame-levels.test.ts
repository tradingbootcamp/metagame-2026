import { describe, expect, it } from "vitest";
import {
  activeClasses,
  classLevelLabel,
  isMegagameClass,
  NO_LEVELS,
  starterLevels,
} from "./megagame-levels";

describe("activeClasses", () => {
  it("is empty at level 0 everywhere", () => {
    expect(activeClasses(NO_LEVELS)).toEqual([]);
  });

  it("keeps only non-zero classes, in class order", () => {
    expect(activeClasses({ wizard: 5, pirate: 0, alien: 3 })).toEqual([
      { class: "wizard", level: 5 },
      { class: "alien", level: 3 },
    ]);
  });
});

describe("starterLevels", () => {
  it("sets the chosen class to 1 and the rest to 0", () => {
    expect(starterLevels("pirate")).toEqual({
      wizard: 0,
      pirate: 1,
      alien: 0,
    });
  });
});

describe("isMegagameClass", () => {
  it("accepts only the three classes", () => {
    expect(isMegagameClass("alien")).toBe(true);
    expect(isMegagameClass("bard")).toBe(false);
    expect(isMegagameClass(null)).toBe(false);
  });
});

it("labels a level", () => {
  expect(classLevelLabel("alien", 3)).toBe("Level 3 Alien");
});
