// Megagame class levels: plain data, no database imports, so client
// components can use it. Reads and writes are in megagame-store.ts.

export const MEGAGAME_CLASSES = ["wizard", "pirate", "alien"] as const;
export type MegagameClass = (typeof MEGAGAME_CLASSES)[number];

export const MAX_LEVEL = 5;

export type MegagameLevels = Record<MegagameClass, number>;

export const NO_LEVELS: MegagameLevels = { wizard: 0, pirate: 0, alien: 0 };

export const CLASS_LABELS: Record<MegagameClass, string> = {
  wizard: "Wizard",
  pirate: "Pirate",
  alien: "Alien",
};

/** What each class's players join. */
export const FACTION_NAMES: Record<MegagameClass, string> = {
  wizard: "Astral College",
  pirate: "Brethren Fleet",
  alien: "Galactic Survey",
};

export const isMegagameClass = (value: unknown): value is MegagameClass =>
  MEGAGAME_CLASSES.includes(value as MegagameClass);

/** The classes with a level above 0, in MEGAGAME_CLASSES order. */
export function activeClasses(
  levels: MegagameLevels,
): { class: MegagameClass; level: number }[] {
  return MEGAGAME_CLASSES.filter((c) => levels[c] > 0).map((c) => ({
    class: c,
    level: levels[c],
  }));
}

/** "Level 3 Alien" */
export const classLevelLabel = (c: MegagameClass, level: number) =>
  `Level ${level} ${CLASS_LABELS[c]}`;

/** Level 1 in `chosen`, 0 in the rest: what picking a class sets. */
export const starterLevels = (chosen: MegagameClass): MegagameLevels => ({
  ...NO_LEVELS,
  [chosen]: 1,
});
