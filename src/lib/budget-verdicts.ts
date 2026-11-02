import { PHASES, type Category, type LedgerRow } from "./budget-ledger";

// Pure helpers for the model-comparison experiment (META-4571): which models
// to run, how a Jev (TypeSafe) answer becomes a proposal, and the pick tally.
// No IO here; budget-models.ts does the calls and the Postgres writes.

export type Confidence = "high" | "medium" | "low";

/** One model's answer for one Xero line, as stored in budget_proposal_verdicts. */
export type Verdict = {
  item: string;
  category: string;
  parent: string | null;
  phase: string;
  counterparty: string;
  confidence: Confidence;
  reason: string;
};

export type VerdictRow = {
  xeroId: string;
  model: string;
  verdict: Verdict | null;
  error: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  picked: boolean;
};

export type Provider = "anthropic" | "typesafe";

/** "claude-…" is Anthropic; "jev-…" (optionally "typesafe/" prefixed) is TypeSafe. */
export function providerOf(model: string): Provider {
  return /^(typesafe\/)?jev/i.test(model) ? "typesafe" : "anthropic";
}

/** Strips a "typesafe/" prefix so the id can go straight to the API. */
export const apiModelId = (model: string) => model.replace(/^typesafe\//i, "");

/** BUDGET_COMPARE_MODELS: comma-separated, first entry is the one written to the sheet. */
export function parseModelList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

export function confidenceFromProbability(p: number): Confidence {
  if (p >= 0.75) return "high";
  if (p >= 0.5) return "medium";
  return "low";
}

/** The Jev request body for category + phase of one line. */
export type JevQuestions = Record<
  string,
  { type: "choice"; instructions: string; criteria: Record<string, string> }
>;

export function jevCategoryQuestions(
  categories: Category[],
  isIncome: boolean,
): JevQuestions {
  const eligible = categories.filter((c) =>
    isIncome ? c.type === "Income" : c.type === "Expense",
  );
  const criteria = Object.fromEntries(
    eligible.map((c) => [c.name, `${c.group} (${c.type})`]),
  );
  return {
    category: {
      type: "choice",
      instructions:
        "Which budget category does this Xero line belong to? Pick the one whose name and group best fit the account and description.",
      criteria,
    },
    phase: {
      type: "choice",
      instructions:
        "When does this spend belong: Pre = run-up before the event week (local transit, pre-event meals, coworking, marketing), Event = the conference itself (venue, travel to it, supplies, housing during it), Post = after.",
      criteria: {
        Pre: "Before the event week",
        Event: "The conference itself",
        Post: "After the event",
      },
    },
  };
}

/** The Jev request body for the parent of one line, given its category's plan rows. */
export function jevParentQuestions(plans: LedgerRow[]): JevQuestions {
  const criteria: Record<string, string> = {
    none: "This line is not part of any listed plan; it stands on its own.",
  };
  for (const p of plans) {
    criteria[p.id] =
      `${p.item} (budget ${p.budgeted ?? "unknown"}, ${p.counterparty || "no counterparty"})`;
  }
  return {
    parent: {
      type: "choice",
      instructions:
        "Does this line clearly pay for part of one of these existing plan rows (for example a flight against that person's travel budget)? If not, choose none.",
      criteria,
    },
  };
}

export type JevChoice = {
  type: "choice";
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
};

const probabilityOf = (a: JevChoice | undefined, pick: string) =>
  a?.probabilities?.[pick] ?? a?.confidence ?? 0;

/**
 * Builds a verdict from Jev's answers. Jev decides, it doesn't write, so the
 * item and counterparty come from the line itself.
 */
export function jevVerdict(
  line: {
    description: string;
    contact: string;
    account: string;
  },
  answers: {
    category?: JevChoice;
    phase?: JevChoice;
    parent?: JevChoice;
  },
  model: string,
): Verdict {
  const category = answers.category?.choice ?? "";
  const pCat = probabilityOf(answers.category, category);
  const phaseRaw = answers.phase?.choice ?? "";
  const phase = (PHASES as readonly string[]).includes(phaseRaw)
    ? phaseRaw
    : "";
  const parentRaw = answers.parent?.choice ?? "none";
  const parent = parentRaw && parentRaw !== "none" ? parentRaw : null;
  const parts = [`category ${pCat.toFixed(2)}`];
  if (answers.phase) {
    parts.push(`phase ${probabilityOf(answers.phase, phaseRaw).toFixed(2)}`);
  }
  if (answers.parent) {
    parts.push(`parent ${probabilityOf(answers.parent, parentRaw).toFixed(2)}`);
  }
  return {
    item: line.description || line.contact || line.account,
    category,
    parent,
    phase,
    counterparty: line.contact,
    confidence: confidenceFromProbability(pCat),
    reason: `${model} probabilities: ${parts.join(", ")}`,
  };
}

export type Tally = {
  model: string;
  verdicts: number;
  picked: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
};

/** Per-model counts over stored verdict rows: how often each one got picked. */
export function tallyPicks(rows: VerdictRow[]): Tally[] {
  const byModel = new Map<string, Tally>();
  for (const r of rows) {
    const t = byModel.get(r.model) ?? {
      model: r.model,
      verdicts: 0,
      picked: 0,
      errors: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    t.verdicts++;
    if (r.picked) t.picked++;
    if (r.error) t.errors++;
    t.inputTokens += r.inputTokens ?? 0;
    t.outputTokens += r.outputTokens ?? 0;
    byModel.set(r.model, t);
  }
  return [...byModel.values()].sort((a, b) => b.picked - a.picked);
}
