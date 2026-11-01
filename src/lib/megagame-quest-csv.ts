// The quest importer's paste format. Pure, so the backstage form and the
// server action share it.

import {
  MAX_LEVEL,
  MEGAGAME_CLASSES,
  isMegagameClass,
  type MegagameClass,
} from "./megagame-levels";
import {
  isCompleteMegagameCode,
  normalizeAnswer,
  normalizeMegagameCode,
  questWindowIsValid,
} from "./megagame-rules";
import { formatTicketCode } from "./ticket-code-format";

export const QUEST_CSV_COLUMNS = [
  "code",
  "title",
  "class",
  "kind",
  "answers",
  "evidence",
  "hint",
  "min_level",
  "max_level",
] as const;
type Column = (typeof QUEST_CSV_COLUMNS)[number];
const REQUIRED: readonly Column[] = ["title", "kind"];

export const MAX_IMPORT_ROWS = 500;
const MAX_TITLE = 200;
const MAX_TEXT = 2000;

export type QuestImportRow = {
  /** Normalized; null means the importer makes one. */
  code: string | null;
  title: string;
  class: MegagameClass | null;
  kind: "answer" | "evidence";
  /** As typed, so the quest page can show what matched. */
  answers: string[];
  evidence: string | null;
  hint: string | null;
  minLevel: number | null;
  maxLevel: number | null;
};

export type QuestCsvResult = { rows: QuestImportRow[]; errors: string[] };

type CsvRecord = { line: number; cells: string[] };

/** RFC 4180 quoting; tab-separated when the first line has a tab. */
function parseRecords(text: string): CsvRecord[] {
  const firstBreak = text.search(/\r?\n/);
  const firstLine = firstBreak === -1 ? text : text.slice(0, firstBreak);
  const sep = firstLine.includes("\t") ? "\t" : ",";

  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let start = 1;
  const endRecord = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== ""))
      records.push({ line: start, cells });
    cells = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"' && cell.trim() === "") {
      quoted = true;
      cell = "";
    } else if (ch === sep) {
      cells.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRecord();
      line++;
      start = line;
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || cells.length > 0) endRecord();
  return records;
}

export function parseCsv(text: string): string[][] {
  return parseRecords(text).map((r) => r.cells);
}

const headerKey = (cell: string) =>
  cell
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

function parseLevel(raw: string): number | null | "bad" {
  if (raw === "") return null;
  if (!/^\d+$/.test(raw)) return "bad";
  const n = Number(raw);
  return n >= 1 && n <= MAX_LEVEL ? n : "bad";
}

export function parseQuestCsv(text: string): QuestCsvResult {
  const records = parseRecords(text);
  if (records.length < 2)
    return { rows: [], errors: ["Paste a header row and at least one quest."] };

  const [header, ...body] = records;
  const errors: string[] = [];
  const index = new Map<Column, number>();
  header.cells.forEach((cell, i) => {
    const key = headerKey(cell);
    if (key === "") return;
    if ((QUEST_CSV_COLUMNS as readonly string[]).includes(key))
      index.set(key as Column, i);
    else errors.push(`Unknown column "${cell.trim()}".`);
  });
  for (const col of REQUIRED)
    if (!index.has(col)) errors.push(`Missing column "${col}".`);
  if (body.length > MAX_IMPORT_ROWS)
    errors.push(`At most ${MAX_IMPORT_ROWS} quests per paste.`);
  if (errors.length > 0) return { rows: [], errors };

  const rows: QuestImportRow[] = [];
  const codeLines = new Map<string, number>();
  for (const { line, cells } of body) {
    const get = (col: Column) => {
      const i = index.get(col);
      return i === undefined ? "" : (cells[i] ?? "").trim();
    };
    const fail = (message: string) => errors.push(`Line ${line}: ${message}`);
    const before = errors.length;

    const title = get("title");
    if (title === "") fail("title is required.");
    else if (title.length > MAX_TITLE)
      fail(`title is longer than ${MAX_TITLE} characters.`);

    const rawClass = get("class").toLowerCase();
    let cls: MegagameClass | null = null;
    if (rawClass !== "") {
      if (isMegagameClass(rawClass)) cls = rawClass;
      else
        fail(
          `class "${get("class")}" is not one of ${MEGAGAME_CLASSES.join(", ")}.`,
        );
    }

    const kind = get("kind").toLowerCase();
    const answers = get("answers")
      .split("|")
      .map((a) => a.trim())
      .filter((a) => normalizeAnswer(a) !== "");
    const evidence = get("evidence").slice(0, MAX_TEXT) || null;
    if (kind !== "answer" && kind !== "evidence")
      fail('kind must be "answer" or "evidence".');
    else if (kind === "answer" && answers.length === 0)
      fail("an answer quest needs at least one answer.");
    else if (kind === "evidence" && evidence === null)
      fail("an evidence quest needs the evidence text.");

    const minLevel = parseLevel(get("min_level"));
    const maxLevel = parseLevel(get("max_level"));
    if (minLevel === "bad")
      fail(`min_level must be a whole number from 1 to ${MAX_LEVEL}.`);
    if (maxLevel === "bad")
      fail(`max_level must be a whole number from 1 to ${MAX_LEVEL}.`);
    if (minLevel !== "bad" && maxLevel !== "bad") {
      if (minLevel !== null && maxLevel !== null && minLevel > maxLevel)
        fail("min_level is above max_level.");
      else if (!questWindowIsValid({ class: cls, minLevel, maxLevel }))
        fail("a level window needs a class.");
    }

    let code: string | null = null;
    if (get("code") !== "") {
      const normalized = normalizeMegagameCode(get("code"));
      if (!isCompleteMegagameCode(normalized)) {
        fail("code must be six characters.");
      } else {
        const seen = codeLines.get(normalized);
        if (seen !== undefined)
          fail(
            `code ${formatTicketCode(normalized)} is already used on line ${seen}.`,
          );
        else codeLines.set(normalized, line);
        code = normalized;
      }
    }

    if (errors.length > before) continue;
    rows.push({
      code,
      title,
      class: cls,
      kind: kind as "answer" | "evidence",
      answers: kind === "answer" ? answers : [],
      evidence,
      hint: get("hint").slice(0, MAX_TEXT) || null,
      minLevel: minLevel as number | null,
      maxLevel: maxLevel as number | null,
    });
  }
  return errors.length > 0 ? { rows: [], errors } : { rows, errors };
}
