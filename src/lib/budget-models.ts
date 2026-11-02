import "server-only";
import { eq, inArray, and } from "drizzle-orm";
import { env } from "@/env";
import { getDb, schema } from "@/db";
import {
  PROPOSE_TOOL,
  RULES,
  userMessage,
  type ProposalSet,
  type Usage as ImportUsage,
  type XeroLine,
} from "./budget-import";
import { isPlanRow, type Category, type LedgerRow } from "./budget-ledger";
import {
  apiModelId,
  jevCategoryQuestions,
  jevParentQuestions,
  jevVerdict,
  parseModelList,
  providerOf,
  type JevChoice,
  type Verdict,
  type VerdictRow,
} from "./budget-verdicts";

// META-4571: run the categorization against several models at once, write
// the first model's answer to the sheet as usual, and keep every model's
// verdict in Postgres so the reviewer can compare them on the card and we
// can tally which one gets picked. Off unless BUDGET_COMPARE_MODELS is set.

const { budgetProposalVerdicts } = schema;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";

export const compareModels = (): string[] =>
  parseModelList(env.BUDGET_COMPARE_MODELS);

export const comparisonOn = (): boolean => compareModels().length > 0;

type Usage = { inputTokens: number; outputTokens: number };

export type ModelResult = {
  model: string;
  set: ProposalSet | null;
  error: string | null;
  usage: Usage;
  latencyMs: number;
};

type Block = { type: string; text?: string; name?: string; input?: unknown };

/** The same ask-then-nudge tool call as budget-import.ts, with usage kept. */
async function anthropicPropose(
  model: string,
  user: string,
): Promise<{ set: ProposalSet; usage: Usage }> {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
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
        model,
        max_tokens: 8192,
        system: `${RULES}\n\nAlways answer by calling the ${PROPOSE_TOOL.name} tool, never in prose.`,
        tools: [PROPOSE_TOOL],
        messages,
      }),
    });
    if (!res.ok)
      throw new Error(`Anthropic API: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      content: Block[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    usage.inputTokens += data.usage?.input_tokens ?? 0;
    usage.outputTokens += data.usage?.output_tokens ?? 0;
    const call = data.content.find(
      (c) => c.type === "tool_use" && c.name === PROPOSE_TOOL.name,
    );
    if (call?.input) return { set: call.input as ProposalSet, usage };
    if (attempt === 0) {
      messages.push(
        { role: "assistant", content: data.content },
        {
          role: "user",
          content: `Call the ${PROPOSE_TOOL.name} tool with that.`,
        },
      );
    }
  }
  throw new Error(`${model} didn't call ${PROPOSE_TOOL.name}.`);
}

type JevResponse = {
  model: string;
  answers: Record<string, JevChoice>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

async function jevAsk(
  model: string,
  state: string,
  questions: unknown,
  usage: Usage,
): Promise<JevResponse> {
  const key = env.TYPESAFE_API_KEY;
  if (!key) throw new Error("TYPESAFE_API_KEY is not set.");
  const res = await fetch(TYPESAFE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: apiModelId(model), state, questions }),
  });
  if (!res.ok)
    throw new Error(`TypeSafe API: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as JevResponse;
  usage.inputTokens += data.usage?.input_tokens ?? 0;
  usage.outputTokens += data.usage?.output_tokens ?? 0;
  return data;
}

const lineState = (l: XeroLine) =>
  [
    `Xero ${l.kind} line dated ${l.date}.`,
    `Contact: ${l.contact || "unknown"}.`,
    `Amount: $${l.amount}.`,
    `Account: ${l.accountCode} ${l.account}.`,
    `Description: ${l.description || "(none)"}.`,
  ].join("\n");

/**
 * Jev decides, it doesn't write: one choice call for category + phase, and a
 * second for the parent when the chosen category has plan rows.
 */
async function jevPropose(
  model: string,
  lines: XeroLine[],
  rows: LedgerRow[],
  categories: Category[],
): Promise<{ set: ProposalSet; usage: Usage }> {
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const plans = rows.filter(isPlanRow);
  const proposals: ProposalSet["proposals"] = [];
  for (const line of lines) {
    const isIncome = line.accountCode.startsWith("4");
    const first = await jevAsk(
      model,
      lineState(line),
      jevCategoryQuestions(categories, isIncome),
      usage,
    );
    const category = first.answers.category?.choice ?? "";
    const candidates = plans.filter((p) => p.category === category);
    let parentAnswer: JevChoice | undefined;
    if (candidates.length) {
      const second = await jevAsk(
        model,
        lineState(line),
        jevParentQuestions(candidates),
        usage,
      );
      parentAnswer = second.answers.parent;
    }
    const v = jevVerdict(
      line,
      { ...first.answers, parent: parentAnswer },
      first.model || model,
    );
    proposals.push({ xeroId: line.xeroId, ...v });
  }
  const high = proposals.filter((p) => p.confidence === "high").length;
  return {
    set: {
      proposals,
      newParents: [],
      summary: `${model}: ${proposals.length} lines placed by choice probabilities, ${high} high confidence. Jev proposes no new plan rows.`,
    },
    usage,
  };
}

async function runModel(
  model: string,
  lines: XeroLine[],
  rows: LedgerRow[],
  categories: Category[],
): Promise<ModelResult> {
  const started = Date.now();
  try {
    const { set, usage } =
      providerOf(model) === "typesafe"
        ? await jevPropose(model, lines, rows, categories)
        : await anthropicPropose(model, userMessage(lines, rows, categories));
    return { model, set, error: null, usage, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      model,
      set: null,
      error: err instanceof Error ? err.message : String(err),
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - started,
    };
  }
}

const verdictOf = (set: ProposalSet | null, xeroId: string): Verdict | null => {
  const p = set?.proposals?.find((x) => x.xeroId === xeroId);
  if (!p) return null;
  const { xeroId: _drop, ...rest } = p;
  void _drop;
  return rest;
};

/**
 * Runs every configured model in parallel, stores all verdicts, and returns
 * the first model's proposal set for the sheet. Throws if that one failed.
 */
export async function compareAndPropose(
  runId: string,
  lines: XeroLine[],
  rows: LedgerRow[],
  categories: Category[],
): Promise<{ input: ProposalSet; usage: ImportUsage }> {
  const models = compareModels();
  const results = await Promise.all(
    models.map((m) => runModel(m, lines, rows, categories)),
  );
  const values = results.flatMap((r) =>
    lines.map((l) => ({
      runId,
      xeroId: l.xeroId,
      model: r.model,
      verdict: verdictOf(r.set, l.xeroId),
      error: r.error,
      // Per-line share of the batch call; Jev's are per line already but
      // summed the same way, so the tally compares like with like.
      inputTokens: Math.round(r.usage.inputTokens / lines.length),
      outputTokens: Math.round(r.usage.outputTokens / lines.length),
      latencyMs: r.latencyMs,
    })),
  );
  if (values.length)
    await getDb().insert(budgetProposalVerdicts).values(values);
  const primary = results[0];
  if (!primary.set) {
    throw new Error(`${primary.model} failed: ${primary.error}`);
  }
  return {
    input: primary.set,
    usage: { model: primary.model, ...primary.usage },
  };
}

/** Stored verdicts for the queue, keyed by Xero id. */
export async function verdictsFor(
  xeroIds: string[],
): Promise<Record<string, VerdictRow[]>> {
  const ids = xeroIds.filter(Boolean);
  if (ids.length === 0) return {};
  const rows = await getDb()
    .select()
    .from(budgetProposalVerdicts)
    .where(inArray(budgetProposalVerdicts.xeroId, ids))
    .orderBy(budgetProposalVerdicts.createdAt);
  const out: Record<string, VerdictRow[]> = {};
  for (const r of rows) {
    (out[r.xeroId] ??= []).push({
      xeroId: r.xeroId,
      model: r.model,
      verdict: (r.verdict as Verdict | null) ?? null,
      error: r.error,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      latencyMs: r.latencyMs,
      picked: r.picked,
    });
  }
  return out;
}

/** Marks which model's verdict the reviewer approved for a line. */
export async function pickVerdict(xeroId: string, model: string) {
  await getDb()
    .update(budgetProposalVerdicts)
    .set({ picked: true })
    .where(
      and(
        eq(budgetProposalVerdicts.xeroId, xeroId),
        eq(budgetProposalVerdicts.model, model),
      ),
    );
}

export async function allVerdicts(): Promise<VerdictRow[]> {
  const rows = await getDb().select().from(budgetProposalVerdicts);
  return rows.map((r) => ({
    xeroId: r.xeroId,
    model: r.model,
    verdict: (r.verdict as Verdict | null) ?? null,
    error: r.error,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    latencyMs: r.latencyMs,
    picked: r.picked,
  }));
}
