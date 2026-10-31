// Pure megagame rules: code and answer matching, level derivation, soft
// checks, and the dashboard's bucket math. No database or Next imports, so
// client components can use it. Class list and level maximum come from
// megagame-levels.ts.

import {
  MAX_LEVEL,
  NO_LEVELS,
  isMegagameClass,
  type MegagameClass,
  type MegagameLevels,
} from "./megagame-levels";
import { TICKET_CODE_LENGTH, normalizeTicketCode } from "./ticket-code-format";

/** A quest or badge code as typed, scanned, or pasted as a /q/<code> URL. */
export function normalizeMegagameCode(input: string): string {
  let text = input.trim();
  const cut = text.search(/[?#]/);
  if (cut !== -1) text = text.slice(0, cut);
  text = text.replace(/\/+$/, "");
  if (text.includes("/")) text = text.slice(text.lastIndexOf("/") + 1);
  return normalizeTicketCode(text);
}

/** Whether a normalized code is a full code, which is what a lookup needs. */
export function isCompleteMegagameCode(code: string): boolean {
  return code.length === TICKET_CODE_LENGTH;
}

/** Case, accents, punctuation and whitespace do not matter. */
export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export type AnswerMatch = { matched: boolean; answer: string | null };

/** `answer` is the accepted answer as stored, for showing the volunteer what matched. */
export function matchAnswer(
  entered: string,
  accepted: readonly string[],
): AnswerMatch {
  const wanted = normalizeAnswer(entered);
  if (wanted === "") return { matched: false, answer: null };
  for (const candidate of accepted) {
    if (normalizeAnswer(candidate) === wanted) {
      return { matched: true, answer: candidate };
    }
  }
  return { matched: false, answer: null };
}

export type LevelEventLike = {
  class: string;
  level: number;
  voidedAt?: Date | string | null;
};

/** Max non-voided level per class, 0 meaning not in that class. */
export function deriveLevels(
  events: readonly LevelEventLike[],
): MegagameLevels {
  const out: MegagameLevels = { ...NO_LEVELS };
  for (const event of events) {
    if (event.voidedAt !== null && event.voidedAt !== undefined) continue;
    if (!isMegagameClass(event.class)) continue;
    if (!Number.isInteger(event.level) || event.level < 1) continue;
    if (event.level > out[event.class]) out[event.class] = event.level;
  }
  return out;
}

export type LevelRequirement = {
  class: MegagameClass;
  level: number;
  /** Non-voided completions of quests in that class. */
  minCompletions: number;
};

/** Tunable soft checks. Empty ships the tool with checks off, which is allowed. */
export const LEVEL_REQUIREMENTS: readonly LevelRequirement[] = [];

export function requirementFor(
  cls: MegagameClass,
  level: number,
  table: readonly LevelRequirement[] = LEVEL_REQUIREMENTS,
): LevelRequirement | null {
  return table.find((row) => row.class === cls && row.level === level) ?? null;
}

export type LevelUpInput = {
  class: MegagameClass;
  /** The level being awarded. */
  level: number;
  /** The player's current levels, from `deriveLevels`. */
  levels: MegagameLevels;
  /** Non-voided completions this player has in that class. */
  completionsInClass: number;
};

export type LevelUpCheck = {
  /** False means refuse: these are not overridable. */
  ok: boolean;
  errors: string[];
  /** Overridable with "Yes, I'm sure" plus an optional reason. */
  warnings: string[];
};

/** "1, 2 and 3" */
function listLevels(levels: number[]): string {
  if (levels.length === 1) return String(levels[0]);
  return `${levels.slice(0, -1).join(", ")} and ${levels.at(-1)}`;
}

export function checkLevelUp(
  input: LevelUpInput,
  table: readonly LevelRequirement[] = LEVEL_REQUIREMENTS,
): LevelUpCheck {
  const { class: cls, level, levels, completionsInClass } = input;
  const current = levels[cls] ?? 0;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isInteger(level) || level < 1) {
    errors.push("A level must be a whole number of 1 or more.");
  } else if (level <= current) {
    errors.push(
      `Already a level ${current} ${cls}; a new level must be higher.`,
    );
  }

  if (errors.length === 0) {
    if (level > MAX_LEVEL) {
      warnings.push(`Level ${level} is above the ${MAX_LEVEL}-level chart.`);
    }
    if (level > current + 1) {
      const skipped: number[] = [];
      for (let n = current + 1; n < level; n += 1) skipped.push(n);
      warnings.push(
        skipped.length === 1
          ? `Skips level ${skipped[0]}.`
          : `Skips levels ${listLevels(skipped)}.`,
      );
    }
    const requirement = requirementFor(cls, level, table);
    if (requirement && completionsInClass < requirement.minCompletions) {
      const quests = completionsInClass === 1 ? "quest" : "quests";
      warnings.push(
        `Has ${completionsInClass} ${cls} ${quests}; level ${level} asks for ${requirement.minCompletions}.`,
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export type QuestWindow = {
  /** Null means any class. */
  class: string | null;
  minLevel?: number | null;
  maxLevel?: number | null;
};

export type QuestWindowCheck = {
  /** False means show the warning; nothing here blocks a confirmation. */
  ok: boolean;
  warnings: string[];
};

export function checkQuestWindow(
  quest: QuestWindow,
  levels: MegagameLevels,
): QuestWindowCheck {
  const warnings: string[] = [];
  if (quest.class === null) return { ok: true, warnings };
  if (!isMegagameClass(quest.class)) {
    warnings.push(`Quest class "${quest.class}" is not a known class.`);
    return { ok: false, warnings };
  }
  const cls = quest.class;
  const level = levels[cls] ?? 0;
  if (level === 0) {
    warnings.push(`Not a ${cls} yet.`);
  } else if (quest.minLevel != null && level < quest.minLevel) {
    warnings.push(
      `Level ${level} ${cls}; this quest asks for level ${quest.minLevel} or higher.`,
    );
  } else if (quest.maxLevel != null && level > quest.maxLevel) {
    warnings.push(
      `Level ${level} ${cls}; this quest is for level ${quest.maxLevel} and below.`,
    );
  }
  return { ok: warnings.length === 0, warnings };
}

/** A level window needs a class. The phase 3 CSV importer calls this per row. */
export function questWindowIsValid(quest: QuestWindow): boolean {
  return (
    quest.class !== null || (quest.minLevel == null && quest.maxLevel == null)
  );
}
