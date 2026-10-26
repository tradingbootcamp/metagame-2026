import "server-only";
import { env } from "@/env";
import {
  appendRows,
  loadLedger,
  nextId,
  PHASES,
  isPlanRow,
  type Category,
  type LedgerRow,
  type RowInput,
} from "./budget-sheet";
import {
  finishRun,
  ignoredXeroIds,
  startRun,
  type ImportRun,
} from "./budget-store";
import { xeroGet } from "./xero";

// One import: pull the Xero lines tagged Event = Metagame 2026, drop the ones
// the ledger already has or the team ignored, ask Claude to place the rest in
// the budget, and write them to the sheet as Proposed rows for review.

const EVENT_TAG = "Metagame 2026";
// Stripe ticket revenue and merchant fees come in through the Tickets tab.
const SKIP_ACCOUNTS = new Set(["4100", "6040"]);
const DEFAULT_MODEL = "claude-opus-5-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export type XeroLine = {
  xeroId: string;
  date: string;
  kind: string;
  contact: string;
  amount: number;
  accountCode: string;
  account: string;
  description: string;
};

/** Xero's "/Date(1760000000000+0000)/" → ISO date. */
export function xeroDateToIso(value: string): string {
  const ms = Number(/\d+/.exec(value)?.[0] ?? 0);
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * The sheet's sign convention: amounts are positive and Type sets the sign,
 * except a refund inside an expense account, which is a negative actual.
 */
export function ledgerAmount(line: XeroLine): number {
  const income = line.accountCode.startsWith("4");
  if (!income && line.kind.startsWith("RECEIVE")) return -line.amount;
  return line.amount;
}

type Tracking = { Name: string; Option: string };
type LineItem = {
  AccountCode?: string;
  Description?: string;
  Tracking?: Tracking[];
};
type BankTransaction = {
  BankTransactionID: string;
  Type: string;
  Date: string;
  Total: number;
  Reference?: string;
  Contact?: { Name?: string };
  LineItems: LineItem[];
};
type ManualJournal = {
  ManualJournalID: string;
  Date: string;
  Narration?: string;
  JournalLines?: {
    AccountCode?: string;
    LineAmount: number;
    Tracking?: Tracking[];
  }[];
};

const eventOf = (tracking: Tracking[] | undefined) =>
  tracking?.find((t) => t.Name === "Event")?.Option;

const sinceClause = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `Date>=DateTime(${y},${m},${d})`;
};

export async function pullXeroLines(since: string): Promise<XeroLine[]> {
  const { Accounts } = await xeroGet<{
    Accounts: { Code?: string; Name: string }[];
  }>("Accounts");
  const accountName = new Map(
    Accounts.filter((a) => a.Code).map((a) => [a.Code as string, a.Name]),
  );
  const lines: XeroLine[] = [];

  for (let page = 1; ; page++) {
    const { BankTransactions } = await xeroGet<{
      BankTransactions: BankTransaction[];
    }>("BankTransactions", {
      where: sinceClause(since),
      order: "Date",
      page: String(page),
    });
    for (const t of BankTransactions) {
      if (t.Type.includes("TRANSFER")) continue;
      const li = t.LineItems[0] ?? {};
      const code = li.AccountCode ?? "";
      if (eventOf(li.Tracking) !== EVENT_TAG || SKIP_ACCOUNTS.has(code)) {
        continue;
      }
      lines.push({
        xeroId: t.BankTransactionID.slice(0, 8),
        date: xeroDateToIso(t.Date),
        kind: t.Type,
        contact: t.Contact?.Name ?? "",
        amount: Math.round(t.Total * 100) / 100,
        accountCode: code,
        account: accountName.get(code) ?? code,
        description: (li.Description ?? t.Reference ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      });
    }
    if (BankTransactions.length < 100) break;
  }

  const { ManualJournals } = await xeroGet<{ ManualJournals: ManualJournal[] }>(
    "ManualJournals",
    { where: sinceClause(since) },
  );
  for (const mj of ManualJournals) {
    const { ManualJournals: full } = await xeroGet<{
      ManualJournals: ManualJournal[];
    }>(`ManualJournals/${mj.ManualJournalID}`);
    const journal = full[0];
    for (const l of journal.JournalLines ?? []) {
      const code = l.AccountCode ?? "";
      if (
        eventOf(l.Tracking) === EVENT_TAG &&
        l.LineAmount > 0 &&
        /^[46]/.test(code)
      ) {
        lines.push({
          xeroId: `MJ ${mj.ManualJournalID.slice(0, 8)}`,
          date: xeroDateToIso(journal.Date),
          kind: "JOURNAL",
          contact: "",
          amount: Math.round(l.LineAmount * 100) / 100,
          accountCode: code,
          account: accountName.get(code) ?? code,
          description: journal.Narration ?? "",
        });
      }
    }
  }

  return lines.sort((a, b) => a.date.localeCompare(b.date));
}

export type Confidence = "high" | "medium" | "low";

export type Proposal = {
  xeroId: string;
  item: string;
  category: string;
  parent: string | null;
  phase: string;
  counterparty: string;
  confidence: Confidence;
  reason: string;
};

export type NewParent = {
  tempId: string;
  item: string;
  category: string;
  phase: string;
  budgeted: number | null;
  reason: string;
};

export type ProposalSet = {
  proposals: Proposal[];
  newParents: NewParent[];
  summary: string;
};

const RULES = `You place bank lines from Xero into the Metagame 2026 budget ledger (a Google Sheet). Each line becomes one Proposed row that a human reviews, so prefer a clear best guess with honest confidence over hedging.

Rules of the ledger:
- Category must be one of the listed categories, spelled exactly. Expense lines go in Expense categories; account codes starting with 4 are income and go in Income categories.
- Phase: Pre = run-up spend before the event week (local transit, pre-event meals, coworking, marketing), Event = the conference itself (venue, speaker and staff travel to it, supplies, childcare, staff housing during it), Post = after.
- Parent: set only when the line clearly pays for part of an existing plan row in the SAME category (a flight against someone's travel budget, an installment of a deposit). Otherwise null. Most imported lines have no parent. Never point at a row with its own parent.
- New parents: propose one only when a line is obviously the first installment of something larger that has no plan row yet (a deposit toward a bigger bill). Give it a budgeted amount if the total is knowable from the description, else leave budgeted null. Reference it from the line via its tempId.
- Item: a short human label (under 60 chars), e.g. "Ricki pre-event sushi", "Sparr flight SFO→OAK". Keep names in the Xero description. Do not include the amount.
- Counterparty: the vendor or the person reimbursed, from the contact or description.
- Confidence: high when account + description map cleanly; medium when the category is a judgment call; low when you are guessing or the line may not belong to Metagame at all (say so in the reason).

Category mapping that has held so far (Xero account → Category):
Advertising / Printing → Marketing. Speakers-Travel → Speaker travel. Flights / Travel (staff) → Staff travel. Hotel / Lodging → Staff housing. Rideshare / Transit → Staff cars (Phase Pre if before the event). Meals → Staff food (Phase Pre if before the event). Office Space → Ops misc. Supplies → Event supplies, or Megagame impl when the description says megagame. Software & Web → SaaS. Sponsor Revenue → Sponsors. Contract Labor by person: Ben Karcher → Chief of staff, Brendan Hurst → Conference lead, David Holt → Marketing.`;

const PROPOSE_TOOL = {
  name: "propose",
  description: "Return the ledger rows to propose for the given Xero lines.",
  input_schema: {
    type: "object",
    properties: {
      newParents: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tempId: { type: "string" },
            item: { type: "string" },
            category: { type: "string" },
            phase: { type: "string", enum: PHASES },
            budgeted: { type: ["number", "null"] },
            reason: { type: "string" },
          },
          required: [
            "tempId",
            "item",
            "category",
            "phase",
            "budgeted",
            "reason",
          ],
        },
      },
      proposals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            xeroId: { type: "string" },
            item: { type: "string" },
            category: { type: "string" },
            parent: {
              type: ["string", "null"],
              description:
                "An existing row id (T###), a newParents tempId, or null.",
            },
            phase: { type: "string", enum: [...PHASES, ""] },
            counterparty: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            reason: {
              type: "string",
              description: "One sentence for the reviewer.",
            },
          },
          required: [
            "xeroId",
            "item",
            "category",
            "parent",
            "phase",
            "counterparty",
            "confidence",
            "reason",
          ],
        },
      },
      summary: {
        type: "string",
        description:
          "Two sentences for the reviewer: what came in, what needs their eye.",
      },
    },
    required: ["newParents", "proposals", "summary"],
  },
} as const;

function userMessage(
  lines: XeroLine[],
  rows: LedgerRow[],
  categories: Category[],
): string {
  const recent = rows
    .filter((r) => r.xeroId && r.actual !== null)
    .slice(-25)
    .map(
      (r) =>
        `- "${r.item}" | ${r.category} | ${r.phase || "—"} | ${r.counterparty}`,
    )
    .join("\n");
  const incoming = lines
    .map(
      (l) =>
        `- ${l.xeroId} | ${l.date} | ${l.kind} | contact "${l.contact}" | $${l.amount} | account ${l.accountCode} ${l.account} | "${l.description}"`,
    )
    .join("\n");
  return `${ledgerContext(rows, categories)}\n\nRecent imported rows, for naming style:\n${recent || "(none)"}\n\nNew Xero lines to place:\n${incoming}`;
}

export async function proposeRows(
  lines: XeroLine[],
  rows: LedgerRow[],
  categories: Category[],
): Promise<ProposalSet> {
  return callClaude<ProposalSet>(
    RULES,
    userMessage(lines, rows, categories),
    PROPOSE_TOOL,
  );
}

/**
 * Turns the model's proposals into sheet rows, repairing anything it got
 * wrong (unknown category, parent in another category) and noting the repair
 * in the Proposal column so the reviewer sees it.
 */
export function buildRows(
  set: ProposalSet,
  lines: XeroLine[],
  rows: LedgerRow[],
  categories: Category[],
  today: string,
): RowInput[] {
  const catByName = new Map(categories.map((c) => [c.name, c]));
  const fallback =
    categories.find((c) => /contingency/i.test(c.name))?.name ??
    categories.find((c) => c.type === "Expense")?.name ??
    "";
  const planById = new Map(rows.filter(isPlanRow).map((r) => [r.id, r]));
  const existing = [...rows];
  const out: RowInput[] = [];
  const parentIds = new Map<string, { id: string; category: string }>();

  const validPhase = (p: string) =>
    (PHASES as readonly string[]).includes(p) ? p : "";

  for (const p of set.newParents ?? []) {
    const id = nextId(existing);
    const notes: string[] = [];
    let category = p.category;
    if (!catByName.has(category)) {
      notes.push(`category "${category}" unknown, used ${fallback}`);
      category = fallback;
    }
    const row: RowInput = {
      id,
      item: p.item,
      category,
      phase: validPhase(p.phase),
      budgeted: p.budgeted ?? null,
      status: "Proposed",
      notes: `proposed plan row, imported ${today}`,
      proposal: ["new plan", p.reason, ...notes].join(". "),
    };
    out.push(row);
    existing.push({ id } as LedgerRow);
    parentIds.set(p.tempId, { id, category });
  }

  const proposed = new Map((set.proposals ?? []).map((p) => [p.xeroId, p]));

  for (const line of lines) {
    const p = proposed.get(line.xeroId);
    const notes: string[] = [];
    let category = p?.category ?? "";
    let confidence: Confidence = p?.confidence ?? "low";
    if (!p) notes.push("the model skipped this line");
    if (!catByName.has(category)) {
      if (category)
        notes.push(`category "${category}" unknown, used ${fallback}`);
      category = fallback;
      confidence = "low";
    }
    let parent = "";
    if (p?.parent) {
      const target = parentIds.get(p.parent) ?? planById.get(p.parent);
      if (!target) notes.push(`parent ${p.parent} not found, left blank`);
      else if (target.category !== category) {
        notes.push(`parent ${target.id} is in ${target.category}, left blank`);
      } else parent = target.id;
    }
    const id = nextId(existing);
    out.push({
      id,
      item: p?.item || line.description || line.contact || line.account,
      parent,
      category,
      phase: validPhase(p?.phase ?? ""),
      counterparty: p?.counterparty || line.contact,
      actual: ledgerAmount(line),
      status: "Proposed",
      date: line.date,
      notes: `Xero acct: ${line.account} | imported ${today}`,
      xeroId: line.xeroId,
      xeroDescription: line.description,
      proposal: [confidence, p?.reason ?? "", ...notes]
        .filter(Boolean)
        .join(". "),
    });
    existing.push({ id } as LedgerRow);
  }
  return out;
}

const REQUEST_RULES = `You turn a short request from the Metagame 2026 organisers into rows for their budget ledger (a Google Sheet). Rows you return are marked Proposed and reviewed by a human before they count.

Rules:
- Never change an existing row. An increase to something already planned is a new child row under that plan row (same Category, parent = its id), e.g. "add $300 to David's housing" → item "David housing, extra", parent = David's housing row, budgeted 300.
- A new sponsor, grant or sale is an Income row: category Sponsors (or Tickets / Room rentals), budgeted = the expected amount, status Planned (Committed if the request says it's signed or confirmed).
- A new planned expense is an Expense row with budgeted = the amount, status Planned or Committed as above. Money already spent with no Xero line yet is an actual: put it in actual, status Done.
- Category must be one of the listed categories, spelled exactly. Parent only when it is in the same category and is a root row (no parent of its own).
- Phase: Pre = run-up before the event week, Event = the conference itself, Post = after. Leave blank for income.
- Item: short human label under 60 chars, no amount in it.
- If the request is ambiguous, still return your best reading and say what you assumed in the reason. If it asks for something the ledger can't express (deleting rows, changing categories), return no rows and explain in summary.`;

const REQUEST_TOOL = {
  name: "add_rows",
  description: "Return the ledger rows the request calls for.",
  input_schema: {
    type: "object",
    properties: {
      rows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item: { type: "string" },
            category: { type: "string" },
            parent: {
              type: ["string", "null"],
              description:
                "An existing root row id (T###) in the same category, or null.",
            },
            phase: { type: "string", enum: [...PHASES, ""] },
            counterparty: { type: "string" },
            budgeted: { type: ["number", "null"] },
            actual: { type: ["number", "null"] },
            status: { type: "string", enum: ["Planned", "Committed", "Done"] },
            reason: { type: "string" },
          },
          required: [
            "item",
            "category",
            "parent",
            "phase",
            "counterparty",
            "budgeted",
            "actual",
            "status",
            "reason",
          ],
        },
      },
      summary: {
        type: "string",
        description: "One or two sentences back to the requester.",
      },
    },
    required: ["rows", "summary"],
  },
} as const;

export type RequestedRow = {
  item: string;
  category: string;
  parent: string | null;
  phase: string;
  counterparty: string;
  budgeted: number | null;
  actual: number | null;
  status: "Planned" | "Committed" | "Done";
  reason: string;
};

export type RequestResult = { rows: RequestedRow[]; summary: string };

type Block = { type: string; text?: string; name?: string; input?: unknown };

/**
 * One tool-use round trip. The model is asked, not forced, to call the tool
 * (forced tool_choice isn't supported on every model); if it answers in prose
 * instead, one nudge asks again.
 */
async function callClaude<T>(
  system: string,
  user: string,
  tool: typeof PROPOSE_TOOL | typeof REQUEST_TOOL,
): Promise<T> {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
  const messages: { role: "user" | "assistant"; content: unknown }[] = [
    { role: "user", content: user },
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.BUDGET_MODEL ?? DEFAULT_MODEL,
        max_tokens: 8192,
        system: `${system}\n\nAlways answer by calling the ${tool.name} tool, never in prose.`,
        tools: [tool],
        messages,
      }),
    });
    if (!res.ok)
      throw new Error(`Anthropic API: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { content: Block[] };
    const call = data.content.find(
      (c) => c.type === "tool_use" && c.name === tool.name,
    );
    if (call?.input) return call.input as T;
    if (attempt === 0) {
      messages.push(
        { role: "assistant", content: data.content },
        { role: "user", content: `Call the ${tool.name} tool with that.` },
      );
      continue;
    }
    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join(" ")
      .slice(0, 300);
    throw new Error(`The model didn't call ${tool.name}. ${text}`.trim());
  }
  throw new Error("unreachable");
}

function ledgerContext(rows: LedgerRow[], categories: Category[]): string {
  const cats = categories
    .map(
      (c) =>
        `- ${c.name} (${c.type}, ${c.group}${c.budget ? `, budget $${c.budget}` : ""})`,
    )
    .join("\n");
  const plans = rows
    .filter(isPlanRow)
    .map(
      (r) =>
        `- ${r.id} "${r.item}" | ${r.category} | ${r.phase || "no phase"} | budget ${r.budgeted ?? "—"} | actual ${r.actual ?? "—"} | ${r.status}`,
    )
    .join("\n");
  return `Categories:\n${cats}\n\nOpen plan rows (possible parents):\n${plans || "(none)"}`;
}

/** A sentence from the team → Proposed plan rows. */
export async function requestRows(
  text: string,
  rows: LedgerRow[],
  categories: Category[],
  requestedBy: string,
): Promise<{ inputs: RowInput[]; summary: string }> {
  const result = await callClaude<RequestResult>(
    REQUEST_RULES,
    `${ledgerContext(rows, categories)}\n\nRequest from ${requestedBy}:\n${text}`,
    REQUEST_TOOL,
  );
  const catByName = new Map(categories.map((c) => [c.name, c]));
  const planById = new Map(rows.filter(isPlanRow).map((r) => [r.id, r]));
  const existing = [...rows];
  const today = new Date().toISOString().slice(0, 10);
  const inputs: RowInput[] = [];
  for (const r of result.rows ?? []) {
    const notes: string[] = [];
    if (!catByName.has(r.category)) {
      notes.push(`category "${r.category}" unknown; pick one`);
    }
    let parent = "";
    if (r.parent) {
      const target = planById.get(r.parent);
      if (!target) notes.push(`parent ${r.parent} not found, left blank`);
      else if (target.category !== r.category) {
        notes.push(`parent ${target.id} is in ${target.category}, left blank`);
      } else parent = target.id;
    }
    const id = nextId(existing);
    inputs.push({
      id,
      item: r.item,
      parent,
      category: catByName.has(r.category) ? r.category : "",
      phase: (PHASES as readonly string[]).includes(r.phase) ? r.phase : "",
      counterparty: r.counterparty,
      budgeted: r.budgeted,
      actual: r.actual,
      status: "Proposed",
      date: r.actual !== null ? today : null,
      notes: `requested by ${requestedBy} ${today}: ${text.slice(0, 120)}`,
      proposal: [`will be ${r.status}`, r.reason, ...notes].join(". "),
    });
    existing.push({ id } as LedgerRow);
  }
  return { inputs, summary: result.summary };
}

const DAY = 86_400_000;

/** Two weeks before the newest imported line, so late postings are caught. */
export function defaultSince(rows: LedgerRow[]): string {
  const latest = rows
    .filter((r) => r.xeroId && r.date)
    .map((r) => r.date as string)
    .sort()
    .at(-1);
  if (!latest) return "2026-01-01";
  return new Date(Date.parse(latest) - 14 * DAY).toISOString().slice(0, 10);
}

export type ImportResult = {
  run: ImportRun;
  pulled: number;
  proposed: number;
  skipped: number;
  summary: string;
};

export async function runImport(options: {
  since?: string;
  triggeredBy: string;
}): Promise<ImportResult> {
  const { rows, categories } = await loadLedger();
  const since = options.since ?? defaultSince(rows);
  const run = await startRun(since, options.triggeredBy);
  try {
    const lines = await pullXeroLines(since);
    const known = new Set(rows.map((r) => r.xeroId).filter(Boolean));
    const ignored = await ignoredXeroIds();
    const fresh = lines.filter(
      (l) => !known.has(l.xeroId) && !ignored.has(l.xeroId),
    );
    const skipped = lines.length - fresh.length;
    if (fresh.length === 0) {
      const summary = `Nothing new since ${since}.`;
      await finishRun(run.id, {
        status: "done",
        pulled: lines.length,
        proposed: 0,
        skipped,
        summary,
      });
      return { run, pulled: lines.length, proposed: 0, skipped, summary };
    }
    const set = await proposeRows(fresh, rows, categories);
    const today = new Date().toISOString().slice(0, 10);
    const inputs = buildRows(set, fresh, rows, categories, today);
    await appendRows(rows, inputs);
    await finishRun(run.id, {
      status: "done",
      pulled: lines.length,
      proposed: inputs.length,
      skipped,
      summary: set.summary,
    });
    return {
      run,
      pulled: lines.length,
      proposed: inputs.length,
      skipped,
      summary: set.summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishRun(run.id, { status: "failed", error: message });
    throw err;
  }
}
