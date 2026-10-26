import { env } from "@/env";
import {
  deleteRow,
  readRanges,
  sheetIdByTitle,
  writeRanges,
  type CellValue,
} from "./google-sheets";
import {
  isoToSerial,
  parseCategories,
  parseLedger,
  type Category,
  type LedgerRow,
  type RowInput,
} from "./budget-ledger";

// Reads and writes against the Metagame 2026 Budget sheet. Expense categories
// start at Categories row 10; the read runs long so inserted rows are seen. The row model,
// column rules and pure helpers live in budget-ledger.ts so client code can
// import them without pulling in the service-account client.

export const DEFAULT_SHEET_ID = "1VRbMkCw9efO6ULxKuo9SxXA9zDcrMdsB4UjV_cu-1ak";
export const LEDGER_TAB = "2026 Transactions v2";
export const CATEGORIES_TAB = "2026 Categories";
const LAST_ROW = 400;

export const sheetId = (): string => env.BUDGET_SHEET_ID ?? DEFAULT_SHEET_ID;

export const sheetUrl = (): string =>
  `https://docs.google.com/spreadsheets/d/${sheetId()}/edit`;

export * from "./budget-ledger";

export async function loadLedger(): Promise<{
  rows: LedgerRow[];
  categories: Category[];
}> {
  const [ledger, income, expense] = await readRanges(sheetId(), [
    `'${LEDGER_TAB}'!A2:T${LAST_ROW}`,
    `'${CATEGORIES_TAB}'!A5:D7`,
    `'${CATEGORIES_TAB}'!A10:D80`,
  ]);
  return {
    rows: parseLedger(ledger),
    categories: parseCategories([...income, ...expense]),
  };
}

const cell = (v: string | number | null | undefined): CellValue =>
  v === undefined || v === null ? "" : v;

/** The three writable spans of a row (plus Proposal), as batch ranges. */
function rowRanges(
  row: number,
  r: RowInput,
): { range: string; values: CellValue[][] }[] {
  const tab = `'${LEDGER_TAB}'`;
  return [
    {
      range: `${tab}!A${row}:D${row}`,
      values: [[r.id, r.item, cell(r.parent), r.category]],
    },
    {
      range: `${tab}!G${row}:J${row}`,
      values: [
        [cell(r.phase), cell(r.counterparty), cell(r.budgeted), cell(r.actual)],
      ],
    },
    {
      range: `${tab}!N${row}:R${row}`,
      values: [
        [
          r.status,
          r.date ? isoToSerial(r.date) : "",
          cell(r.notes),
          cell(r.xeroId),
          cell(r.xeroDescription),
        ],
      ],
    },
    { range: `${tab}!T${row}`, values: [[cell(r.proposal)]] },
  ];
}

/** Appends after the last used row. Caller assigns ids with nextId(). */
export async function appendRows(
  existing: LedgerRow[],
  rows: RowInput[],
): Promise<void> {
  const last = existing.reduce((m, r) => Math.max(m, r.row), 1);
  if (last + rows.length > LAST_ROW) {
    throw new Error(`The ledger tab is full (row ${LAST_ROW}). Add rows.`);
  }
  await writeRanges(
    sheetId(),
    rows.flatMap((r, i) => rowRanges(last + 1 + i, r)),
  );
}

/** Rewrites one row's writable cells in place. */
export async function replaceRow(row: number, r: RowInput): Promise<void> {
  await writeRanges(sheetId(), rowRanges(row, r));
}

export async function removeRow(row: number): Promise<void> {
  const tab = await sheetIdByTitle(sheetId(), LEDGER_TAB);
  await deleteRow(sheetId(), tab, row);
}
