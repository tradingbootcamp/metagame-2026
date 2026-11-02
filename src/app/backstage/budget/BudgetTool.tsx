"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  addPlanAction,
  approveAction,
  approveManyAction,
  rejectAction,
  requestAction,
  runImportAction,
  type PlanInput,
  type Result,
  type RowPatch,
} from "./actions";
import {
  buttonClass,
  fieldClass,
  selectClass,
  selectStyle,
  smallButtonClass,
} from "../ui";
import BudgetBrowse from "./BudgetBrowse";
import { PHASES, type Category, type LedgerRow } from "@/lib/budget-ledger";
import { tokens, usd } from "@/lib/budget-pricing";
import type { XeroStatus } from "@/lib/xero";
import type { Verdict, VerdictRow } from "@/lib/budget-verdicts";
import VerdictOptions from "./VerdictOptions";
import { pickVerdictAction } from "./verdict-actions";

export type RunSummary = {
  id: string;
  kind: string;
  status: string;
  triggeredBy: string | null;
  since: string;
  pulled: number;
  proposed: number;
  skipped: number;
  summary: string | null;
  error: string | null;
  startedAt: string;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  /** USD, or null when the model isn't in the price table. */
  cost: number | null;
};

export type Spend = { calls: number; cost: number | null; tokens: number };

const money = (n: number | null) =>
  n === null
    ? "—"
    : (n < 0 ? "−" : "") +
      "$" +
      Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const panel = "rounded-xl border border-line bg-white p-4 shadow-sm";
const label =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60";
const primary = buttonClass.replace("w-full ", "");

function Flash({ result }: { result: Result | null }) {
  if (!result) return null;
  return (
    <p
      role="status"
      className={`mt-2 text-sm ${result.ok ? "text-moss" : "text-meeple"}`}
    >
      {result.ok ? result.message : result.error}
    </p>
  );
}

export default function BudgetTool({
  queue: initialQueue,
  plans: initialPlans,
  ledger,
  categories,
  canManage,
  verdicts,
  xero,
  runs,
  spend,
  sheetUrl,
  sheetError,
  defaultSince,
  notice,
}: {
  queue: LedgerRow[];
  plans: LedgerRow[];
  ledger: LedgerRow[];
  categories: Category[];
  canManage: boolean;
  verdicts: Record<string, VerdictRow[]>;
  xero: XeroStatus & { configured: boolean };
  runs: RunSummary[];
  spend: Spend;
  sheetUrl: string;
  sheetError: string | null;
  defaultSince: string;
  notice: string | null;
}) {
  const router = useRouter();
  // Hidden at once on approve/reject; the server's list catches up on refresh.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const queue = initialQueue.filter((r) => !hidden.has(r.id));
  const plans = initialPlans;
  const [tab, setTab] = useState<"budget" | "queue" | "add" | "ask">(
    initialQueue.length > 0 ? "queue" : "budget",
  );

  const hide = (ids: string[]) => {
    setHidden((h) => new Set([...h, ...ids]));
    router.refresh();
  };

  const confidence = (r: LedgerRow) =>
    /^high\b/.test(r.proposal)
      ? "high"
      : /^medium\b/.test(r.proposal)
        ? "medium"
        : "low";
  const highIds = queue
    .filter((r) => confidence(r) === "high")
    .map((r) => r.id);

  return (
    <div className="space-y-6">
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm"
        >
          {notice}
        </p>
      )}
      {sheetError && (
        <p
          role="alert"
          className="rounded-lg border border-meeple/40 bg-white px-4 py-2 text-sm text-meeple"
        >
          {sheetError}
        </p>
      )}

      <ImportPanel
        xero={xero}
        runs={runs}
        sheetUrl={sheetUrl}
        defaultSince={defaultSince}
        canManage={canManage}
        spend={spend}
      />

      <nav className="flex flex-wrap gap-2">
        {(
          [
            ["budget", "Budget"],
            ["queue", `Review (${queue.length})`],
            ["add", "Add a plan"],
            ["ask", "Ask Claude"],
          ] as const
        )
          .filter(([key]) => canManage || key === "queue" || key === "budget")
          .map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-3 py-1 text-sm ${
                tab === key
                  ? "bg-navy text-white"
                  : "border border-line bg-white text-ink/70"
              }`}
            >
              {text}
            </button>
          ))}
      </nav>

      {tab === "budget" && (
        <BudgetBrowse
          categories={categories}
          ledger={ledger}
          pending={queue.length}
          sheetUrl={sheetUrl}
        />
      )}
      {tab === "queue" && (
        <Queue
          queue={queue}
          plans={plans}
          categories={categories}
          highIds={highIds}
          confidence={confidence}
          readOnly={!canManage}
          verdicts={verdicts}
          onDone={(id) => hide([id])}
          onDoneMany={hide}
        />
      )}
      {tab === "add" && (
        <AddPlan
          plans={plans}
          categories={categories}
          onAdded={router.refresh}
        />
      )}
      {tab === "ask" && (
        <AskClaude
          onProposed={() => {
            setTab("queue");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ImportPanel({
  xero,
  runs,
  sheetUrl,
  defaultSince,
  canManage,
  spend,
}: {
  xero: XeroStatus & { configured: boolean };
  runs: RunSummary[];
  sheetUrl: string;
  defaultSince: string;
  canManage: boolean;
  spend: Spend;
}) {
  const [since, setSince] = useState(defaultSince);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const [history, setHistory] = useState(false);
  const last = runs.find((r) => r.kind === "import");

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span
            className={`mr-2 inline-block size-2.5 rounded-full align-middle ${
              xero.connected ? "bg-moss" : "bg-meeple"
            }`}
          />
          {xero.connected
            ? `Xero: ${xero.tenantName ?? "connected"}`
            : xero.configured
              ? "Xero not connected"
              : "Xero keys not set"}
          {xero.connected && xero.connectedBy && (
            <span className="text-ink/50"> · by {xero.connectedBy}</span>
          )}
        </div>
        <div className="flex gap-3 text-sm">
          {xero.configured && canManage && (
            <a
              href="/api/budget/xero/connect"
              className="underline underline-offset-2"
            >
              {xero.connected ? "Reconnect Xero" : "Connect Xero"}
            </a>
          )}
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Open sheet
          </a>
        </div>
      </div>

      {canManage && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => setResult(await runImportAction(since)));
          }}
        >
          <div>
            <label htmlFor="since" className={label}>
              Xero lines since
            </label>
            <input
              id="since"
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className={fieldClass.replace("w-full", "")}
            />
          </div>
          <button
            type="submit"
            disabled={pending || !xero.connected}
            className={primary}
          >
            {pending ? "Importing…" : "Run import"}
          </button>
        </form>
      )}
      <Flash result={result} />

      {last && (
        <p className="mt-3 text-xs text-ink/60">
          Last import {when(last.startedAt)} by {last.triggeredBy ?? "?"}:{" "}
          {last.status === "failed"
            ? `failed — ${last.error}`
            : last.status === "running"
              ? "still running"
              : `${last.pulled} pulled, ${last.proposed} proposed, ${last.skipped} already in the sheet.`}
          {last.inputTokens > 0 && <RunCost run={last} />}
        </p>
      )}
      {spend.calls > 0 && (
        <p className="mt-1 text-xs text-ink/60">
          Claude so far: {spend.calls} call{spend.calls === 1 ? "" : "s"},{" "}
          {tokens(spend.tokens)} tokens
          {spend.cost !== null ? `, about ${usd(spend.cost)}` : ""}.{" "}
          <button
            type="button"
            onClick={() => setHistory((h) => !h)}
            className="underline underline-offset-2"
          >
            {history ? "Hide history" : "History"}
          </button>
        </p>
      )}
      {history && (
        <ul className="mt-2 divide-y divide-line text-xs">
          {runs.map((r) => (
            <li key={r.id} className="py-1.5">
              <span className="text-ink/50">{when(r.startedAt)} · </span>
              {r.kind === "request" ? "Ask Claude" : `Import since ${r.since}`}
              {r.triggeredBy ? ` by ${r.triggeredBy}` : ""}:{" "}
              {r.status === "failed"
                ? `failed — ${r.error}`
                : r.kind === "request"
                  ? `${r.proposed} proposed`
                  : `${r.pulled} pulled, ${r.proposed} proposed`}
              {r.inputTokens > 0 && <RunCost run={r} />}
              {r.summary && (
                <span className="block truncate text-ink/50" title={r.summary}>
                  {r.summary}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RunCost({ run }: { run: RunSummary }) {
  return (
    <span className="text-ink/50">
      {" "}
      · {tokens(run.inputTokens)} in / {tokens(run.outputTokens)} out
      {run.cost !== null ? ` ≈ ${usd(run.cost)}` : ""}
      {run.model ? ` (${run.model.replace(/^claude-/, "")})` : ""}
    </span>
  );
}

// Searchable across every plan, not just the current category: picking a plan
// from another category moves the row into it, since a child must share its
// parent's category.
function ParentSelect({
  value,
  category,
  plans,
  onChange,
  id,
}: {
  value: string;
  category: string;
  plans: LedgerRow[];
  onChange: (parent: string, category: string) => void;
  id: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const chosen = plans.find((p) => p.id === value);
  const q = query.trim().toLowerCase();
  const hit = (p: LedgerRow) =>
    !q ||
    p.id.toLowerCase().includes(q) ||
    p.item.toLowerCase().includes(q) ||
    p.counterparty.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q);
  const matches = plans
    .filter(hit)
    .sort((a, b) =>
      (a.category === category) === (b.category === category)
        ? 0
        : a.category === category
          ? -1
          : 1,
    )
    .slice(0, q ? 12 : 8);
  const pick = (p: LedgerRow | null) => {
    onChange(p?.id ?? "", p?.category ?? category);
    setQuery("");
    setOpen(false);
  };
  const describe = (p: LedgerRow) =>
    `${p.id} · ${p.item}${p.budgeted !== null ? ` (${money(p.budgeted)})` : ""}`;

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      {chosen && !open ? (
        <div className={`${fieldClass} flex items-center gap-2`}>
          <span className="min-w-0 flex-1 truncate text-sm">
            {describe(chosen)}
            <span className="text-ink/50"> · {chosen.category}</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 text-xs text-ink/60 underline underline-offset-2"
          >
            change
          </button>
          <button
            type="button"
            onClick={() => pick(null)}
            aria-label="Clear parent"
            className="shrink-0 text-ink/60"
          >
            ×
          </button>
        </div>
      ) : (
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          value={query}
          placeholder={
            value && !chosen ? `${value} (not a plan row)` : "No parent"
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && q && matches[0]) {
              e.preventDefault();
              pick(matches[0]);
            }
          }}
          className={fieldClass}
        />
      )}
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 text-sm shadow-lg"
        >
          {value && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pick(null)}
                className="w-full px-3 py-1.5 text-left text-ink/60 hover:bg-ink/5"
              >
                No parent
              </button>
            </li>
          )}
          {matches.length === 0 && (
            <li className="px-3 py-1.5 text-ink/50">No plan rows match.</li>
          )}
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={p.id === value}
                onClick={() => pick(p)}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left hover:bg-ink/5"
              >
                <span className="min-w-0 truncate">{describe(p)}</span>
                <span
                  className={`shrink-0 text-xs ${p.category === category ? "text-ink/40" : "text-navy"}`}
                >
                  {p.category}
                </span>
              </button>
            </li>
          ))}
          {!q && (
            <li className="px-3 pt-1 text-xs text-ink/40">
              Type an id, name or category to search all plans.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function CategorySelect({
  value,
  categories,
  onChange,
  id,
}: {
  value: string;
  categories: Category[];
  onChange: (v: string) => void;
  id: string;
}) {
  const groups = useMemo(() => {
    const out: { group: string; items: Category[] }[] = [];
    for (const c of categories) {
      const last = out.at(-1);
      if (last?.group === c.group) last.items.push(c);
      else out.push({ group: c.group, items: [c] });
    }
    return out;
  }, [categories]);
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
      style={selectStyle}
    >
      {!value && <option value="">Pick a category</option>}
      {groups.map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.items.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function PhaseSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
      style={selectStyle}
    >
      <option value="">No phase</option>
      {PHASES.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

function Queue({
  queue,
  plans,
  categories,
  highIds,
  confidence,
  readOnly,
  verdicts,
  onDone,
  onDoneMany,
}: {
  queue: LedgerRow[];
  plans: LedgerRow[];
  categories: Category[];
  highIds: string[];
  confidence: (r: LedgerRow) => "high" | "medium" | "low";
  readOnly: boolean;
  verdicts: Record<string, VerdictRow[]>;
  onDone: (id: string) => void;
  onDoneMany: (ids: string[]) => void;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  if (queue.length === 0) {
    return (
      <p className="text-sm text-ink/60">
        Nothing to review. Run an import or ask Claude for something.
      </p>
    );
  }
  return (
    <section className="space-y-3">
      {highIds.length > 1 && !readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            className={smallButtonClass}
            onClick={() =>
              start(async () => {
                const r = await approveManyAction(highIds);
                setResult(r);
                if (r.ok) onDoneMany(highIds);
              })
            }
          >
            Approve all {highIds.length} high-confidence
          </button>
          <Flash result={result} />
        </div>
      )}
      {queue.map((row) => (
        <ProposalCard
          key={row.id}
          row={row}
          plans={plans}
          categories={categories}
          confidence={confidence(row)}
          readOnly={readOnly}
          verdicts={verdicts[row.xeroId] ?? []}
          onDone={onDone}
        />
      ))}
    </section>
  );
}

function ProposalCard({
  row,
  plans,
  categories,
  confidence,
  readOnly,
  verdicts,
  onDone,
}: {
  row: LedgerRow;
  plans: LedgerRow[];
  categories: Category[];
  confidence: "high" | "medium" | "low";
  readOnly: boolean;
  verdicts: VerdictRow[];
  onDone: (id: string) => void;
}) {
  const [patch, setPatch] = useState<RowPatch>({
    item: row.item,
    category: row.category,
    parent: row.parent,
    phase: row.phase,
    counterparty: row.counterparty,
  });
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [pickedModel, setPickedModel] = useState<string | null>(null);
  const pick = (model: string, v: Verdict) => {
    setPickedModel(model);
    setPatch({
      item: v.item,
      category: v.category,
      parent: v.parent ?? "",
      phase: v.phase,
      counterparty: v.counterparty,
    });
  };
  const set = (k: keyof RowPatch) => (v: string) =>
    setPatch((p) => ({ ...p, [k]: v }));

  const amount = row.actual ?? row.budgeted;
  const isActual = row.actual !== null;
  const tone =
    confidence === "high"
      ? "bg-moss/15 text-moss"
      : confidence === "medium"
        ? "bg-tan/30 text-ink"
        : "bg-meeple/15 text-meeple";

  return (
    <article className={panel}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span
            className={`text-lg font-semibold ${amount !== null && amount < 0 ? "text-moss" : ""}`}
          >
            {money(amount)}
          </span>
          <span className="text-sm text-ink/60">
            {isActual ? "actual" : "plan"}
            {row.date ? ` · ${row.date}` : ""}
            {row.counterparty ? ` · ${row.counterparty}` : ""}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
        >
          {row.id} · {confidence}
        </span>
      </header>
      {(row.xeroDescription || row.notes) && (
        <p className="mt-1 truncate text-xs text-ink/50" title={row.notes}>
          {row.xeroDescription || row.notes}
          {row.xeroDescription && row.notes
            ? ` — ${row.notes.replace(/\s*\|\s*imported.*$/, "")}`
            : ""}
        </p>
      )}
      {row.proposal && (
        <p className="mt-2 text-sm text-ink/80 italic">{row.proposal}</p>
      )}

      <VerdictOptions
        verdicts={verdicts}
        pickedModel={pickedModel}
        onPick={pick}
      />

      <fieldset
        disabled={readOnly}
        className="mt-3 grid gap-3 disabled:opacity-70 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label htmlFor={`${row.id}-item`} className={label}>
            Item
          </label>
          <input
            id={`${row.id}-item`}
            value={patch.item}
            onChange={(e) => set("item")(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`${row.id}-cat`} className={label}>
            Category
          </label>
          <CategorySelect
            id={`${row.id}-cat`}
            value={patch.category}
            categories={categories}
            onChange={(v) =>
              setPatch((p) => ({ ...p, category: v, parent: "" }))
            }
          />
        </div>
        <div>
          <label htmlFor={`${row.id}-parent`} className={label}>
            Draws against
          </label>
          <ParentSelect
            id={`${row.id}-parent`}
            value={patch.parent}
            category={patch.category}
            plans={plans}
            onChange={(parent, category) =>
              setPatch((p) => ({ ...p, parent, category }))
            }
          />
        </div>
        <div>
          <label htmlFor={`${row.id}-phase`} className={label}>
            Phase
          </label>
          <PhaseSelect
            id={`${row.id}-phase`}
            value={patch.phase}
            onChange={set("phase")}
          />
        </div>
        <div>
          <label htmlFor={`${row.id}-who`} className={label}>
            Counterparty
          </label>
          <input
            id={`${row.id}-who`}
            value={patch.counterparty}
            onChange={(e) => set("counterparty")(e.target.value)}
            className={fieldClass}
          />
        </div>
      </fieldset>

      {readOnly ? null : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            className={primary}
            onClick={() =>
              start(async () => {
                const r = await approveAction(row.id, patch);
                setResult(r);
                if (r.ok && pickedModel && row.xeroId) {
                  await pickVerdictAction(row.xeroId, pickedModel);
                }
                if (r.ok) onDone(row.id);
              })
            }
          >
            Approve
          </button>
          {rejecting ? (
            <>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  row.xeroId ? "Why? (kept so it won't come back)" : "Why?"
                }
                className={`${fieldClass} max-w-xs`}
              />
              <button
                type="button"
                disabled={pending}
                className={smallButtonClass}
                onClick={() =>
                  start(async () => {
                    const r = await rejectAction(row.id, reason);
                    setResult(r);
                    if (r.ok) onDone(row.id);
                  })
                }
              >
                Confirm reject
              </button>
              <button
                type="button"
                className={smallButtonClass}
                onClick={() => setRejecting(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className={smallButtonClass}
              onClick={() => setRejecting(true)}
            >
              Reject
            </button>
          )}
        </div>
      )}
      <Flash result={result} />
    </article>
  );
}

function AddPlan({
  plans,
  categories,
  onAdded,
}: {
  plans: LedgerRow[];
  categories: Category[];
  onAdded: () => void;
}) {
  const empty: PlanInput = {
    item: "",
    category: "",
    parent: "",
    phase: "",
    counterparty: "",
    budgeted: null,
    status: "Planned",
  };
  const [plan, setPlan] = useState<PlanInput>(empty);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const set =
    <K extends keyof PlanInput>(k: K) =>
    (v: PlanInput[K]) =>
      setPlan((p) => ({ ...p, [k]: v }));

  return (
    <form
      className={`${panel} grid gap-3 sm:grid-cols-2`}
      onSubmit={(e) => {
        e.preventDefault();
        const n =
          amount.trim() === "" ? null : Number(amount.replace(/[$,]/g, ""));
        start(async () => {
          const r = await addPlanAction({ ...plan, budgeted: n });
          setResult(r);
          if (r.ok) {
            setPlan(empty);
            setAmount("");
            onAdded();
          }
        });
      }}
    >
      <div className="sm:col-span-2">
        <label htmlFor="plan-item" className={label}>
          What
        </label>
        <input
          id="plan-item"
          value={plan.item}
          onChange={(e) => set("item")(e.target.value)}
          placeholder="e.g. Acme sponsorship, or Ben extra housing"
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="plan-amount" className={label}>
          Amount
        </label>
        <input
          id="plan-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="15000"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="plan-status" className={label}>
          Status
        </label>
        <select
          id="plan-status"
          value={plan.status}
          onChange={(e) => set("status")(e.target.value as PlanInput["status"])}
          className={selectClass}
          style={selectStyle}
        >
          <option value="Planned">Planned (expected)</option>
          <option value="Committed">Committed (signed / booked)</option>
        </select>
      </div>
      <div>
        <label htmlFor="plan-cat" className={label}>
          Category
        </label>
        <CategorySelect
          id="plan-cat"
          value={plan.category}
          categories={categories}
          onChange={(v) => setPlan((p) => ({ ...p, category: v, parent: "" }))}
        />
      </div>
      <div>
        <label htmlFor="plan-parent" className={label}>
          Draws against
        </label>
        <ParentSelect
          id="plan-parent"
          value={plan.parent}
          category={plan.category}
          plans={plans}
          onChange={(parent, category) =>
            setPlan((p) => ({ ...p, parent, category }))
          }
        />
      </div>
      <div>
        <label htmlFor="plan-phase" className={label}>
          Phase
        </label>
        <PhaseSelect
          id="plan-phase"
          value={plan.phase}
          onChange={set("phase")}
        />
      </div>
      <div>
        <label htmlFor="plan-who" className={label}>
          Counterparty
        </label>
        <input
          id="plan-who"
          value={plan.counterparty}
          onChange={(e) => set("counterparty")(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Adding…" : "Add to the sheet"}
        </button>
        <Flash result={result} />
      </div>
    </form>
  );
}

function AskClaude({ onProposed }: { onProposed: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className={panel}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await requestAction(text);
          setResult(r);
          if (r.ok) {
            setText("");
            onProposed();
          }
        });
      }}
    >
      <label htmlFor="ask" className={label}>
        Tell Claude what to add
      </label>
      <textarea
        id="ask"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. New sponsor Acme, $15k, signed. Or: David's housing is $300 more than planned."
        className={fieldClass}
      />
      <p className="mt-1 text-xs text-ink/50">
        Rows land in the review queue as Proposed for you to approve.
      </p>
      <button
        type="submit"
        disabled={pending || !text.trim()}
        className={`${primary} mt-3`}
      >
        {pending ? "Thinking…" : "Propose rows"}
      </button>
      <Flash result={result} />
    </form>
  );
}
