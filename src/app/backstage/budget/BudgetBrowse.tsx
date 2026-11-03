"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addCategoryAction,
  setBudgetAction,
  type CategoryInput,
  type Result,
} from "./actions";
import { buttonClass, fieldClass, selectClass, selectStyle } from "../ui";
import type { Category, LedgerRow } from "@/lib/budget-ledger";

// Read-only view of the budget as the Categories tab computes it, with the
// ledger rows behind each category one tap away. Numbers come from the sheet's
// own rollups so they match what anyone sees there.

const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : (n < 0 ? "−" : "") +
      "$" +
      Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const sum = (xs: (number | null)[]) =>
  xs.reduce<number>((t, x) => t + (x ?? 0), 0);

const panel = "rounded-xl border border-line bg-white p-4 shadow-sm";
const label =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60";
const primary = buttonClass.replace("w-full ", "");

const parseAmount = (s: string) =>
  s.trim() === "" ? null : Number(s.replace(/[$,]/g, ""));

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

type Props = {
  categories: Category[];
  /** Every ledger row except Proposed ones. */
  ledger: LedgerRow[];
  pending: number;
  sheetUrl: string;
  canManage: boolean;
};

export default function BudgetBrowse({
  categories,
  ledger,
  pending,
  sheetUrl,
  canManage,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-ink/60">
        Nothing to show until the sheet is reachable.
      </p>
    );
  }

  const income = categories.filter((c) => c.type === "Income");
  const expense = categories.filter((c) => c.type === "Expense");
  const totals = {
    incomeBudget: sum(income.map((c) => c.budget)),
    incomeActual: sum(income.map((c) => c.actual)),
    incomeForecast: sum(income.map((c) => c.forecast)),
    expenseBudget: sum(expense.map((c) => c.budget)),
    expenseActual: sum(expense.map((c) => c.actual)),
    expenseForecast: sum(expense.map((c) => c.forecast)),
  };

  const groups = (() => {
    const order: string[] = [];
    const by = new Map<string, Category[]>();
    for (const c of expense) {
      if (!by.has(c.group)) {
        by.set(c.group, []);
        order.push(c.group);
      }
      by.get(c.group)!.push(c);
    }
    return order.map((g) => ({ name: g, categories: by.get(g)! }));
  })();

  const recent = ledger
    .filter((r) => r.actual !== null && r.date)
    .sort((a, b) => (a.date! < b.date! ? 1 : -1))
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Headline
          title="Spent so far"
          value={money(totals.expenseActual)}
          sub={`of ${money(totals.expenseBudget)} expense budget`}
        />
        <Headline
          title="Expense forecast"
          value={money(totals.expenseForecast)}
          sub={
            totals.expenseForecast > totals.expenseBudget
              ? `${money(totals.expenseForecast - totals.expenseBudget)} over budget`
              : `${money(totals.expenseBudget - totals.expenseForecast)} under budget`
          }
          tone={totals.expenseForecast > totals.expenseBudget ? "bad" : "good"}
        />
        <Headline
          title="Net forecast"
          value={money(totals.incomeForecast - totals.expenseForecast)}
          sub={`income ${money(totals.incomeActual)} received of ${money(totals.incomeForecast)} forecast`}
          tone={
            totals.incomeForecast - totals.expenseForecast >= 0 ? "good" : "bad"
          }
        />
      </section>

      {pending > 0 && (
        <p className="text-xs text-ink/60">
          {pending} proposed row{pending === 1 ? "" : "s"} awaiting review
          {pending === 1 ? " is" : " are"} counted in these numbers, as in the
          sheet.
        </p>
      )}

      <section className={panel}>
        <h2 className="mb-2 text-sm font-semibold">Income</h2>
        <CategoryTable
          categories={income}
          ledger={ledger}
          open={open}
          setOpen={setOpen}
          canManage={canManage}
          income
        />
      </section>

      {groups.map((g) => (
        <section key={g.name} className={panel}>
          <h2 className="mb-2 text-sm font-semibold">{g.name}</h2>
          <CategoryTable
            categories={g.categories}
            ledger={ledger}
            open={open}
            setOpen={setOpen}
            canManage={canManage}
          />
        </section>
      ))}

      {canManage && (
        <AddCategory categories={categories} onAdded={router.refresh} />
      )}

      <section className={panel}>
        <h2 className="mb-2 text-sm font-semibold">Recent spend</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink/60">No dated actuals yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <span className="min-w-0 truncate">
                  <span className="text-ink/50">{r.date} · </span>
                  {r.item}
                  <span className="text-ink/50"> · {r.category}</span>
                </span>
                <span
                  className={`shrink-0 tabular-nums ${r.type === "Income" ? "text-moss" : ""}`}
                >
                  {money(r.actual)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink/50">
          Figures are the sheet&apos;s own rollups.{" "}
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Open sheet
          </a>
        </p>
      </section>
    </div>
  );
}

function Headline({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: string;
  sub: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className={panel}>
      <p className="text-xs font-semibold tracking-wide text-ink/60 uppercase">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p
        className={`mt-1 text-xs ${
          tone === "bad"
            ? "text-meeple"
            : tone === "good"
              ? "text-moss"
              : "text-ink/60"
        }`}
      >
        {sub}
      </p>
    </div>
  );
}

function CategoryTable({
  categories,
  ledger,
  open,
  setOpen,
  canManage,
  income,
}: {
  categories: Category[];
  ledger: LedgerRow[];
  open: string | null;
  setOpen: (name: string | null) => void;
  canManage: boolean;
  income?: boolean;
}) {
  return (
    <div className="divide-y divide-line">
      {categories.map((c) => {
        const budget = c.budget ?? 0;
        const actual = c.actual ?? 0;
        const forecast = c.forecast ?? 0;
        const over = !income && budget > 0 && forecast > budget + 0.5;
        const spentPct =
          budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;
        const forecastPct =
          budget > 0 ? Math.min(100, Math.round((forecast / budget) * 100)) : 0;
        const isOpen = open === c.name;
        return (
          <div key={c.name} className="py-2">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : c.name)}
              className="flex w-full items-center gap-3 text-left"
              aria-expanded={isOpen}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="shrink-0 tabular-nums">
                    <span className={over ? "text-meeple" : ""}>
                      {money(actual)}
                    </span>
                    <span className="text-ink/50"> / {money(budget)}</span>
                  </span>
                </span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                  <span className="relative block h-full">
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-meeple/40" : "bg-moss/30"}`}
                      style={{ width: `${forecastPct}%` }}
                    />
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-meeple" : income ? "bg-moss" : "bg-navy"}`}
                      style={{ width: `${spentPct}%` }}
                    />
                  </span>
                </span>
                <span className="mt-1 flex justify-between text-xs text-ink/50">
                  <span>
                    forecast {money(forecast)}
                    {over ? ` · ${money(forecast - budget)} over` : ""}
                  </span>
                  <span>
                    {c.unplanned ? `${money(c.unplanned)} unplanned · ` : ""}
                    {money(c.unallocated)} unallocated
                  </span>
                </span>
              </span>
            </button>
            {isOpen && canManage && <EditBudget category={c} />}
            {isOpen && <CategoryRows name={c.name} ledger={ledger} />}
          </div>
        );
      })}
    </div>
  );
}

function EditBudget({ category }: { category: Category }) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    category.budget === null ? "" : String(category.budget),
  );
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const { type, group, name } = category;
          const r = await setBudgetAction(
            { type, group, name },
            parseAmount(amount),
          );
          setResult(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      <label htmlFor={`budget-${category.name}`} className="text-ink/60">
        Budget
      </label>
      <input
        id={`budget-${category.name}`}
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={`${fieldClass.replace("w-full", "")} w-32 py-1 text-sm`}
      />
      <button
        type="submit"
        disabled={pending}
        className={`${primary} px-3 py-1 text-sm`}
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <Flash result={result} />
    </form>
  );
}

const NEW_GROUP = "__new__";

function AddCategory({
  categories,
  onAdded,
}: {
  categories: Category[];
  onAdded: () => void;
}) {
  const [type, setType] = useState<"Income" | "Expense">("Expense");
  const [group, setGroup] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  const groups = [
    ...new Set(categories.filter((c) => c.type === type).map((c) => c.group)),
  ];
  const chosenGroup = group === NEW_GROUP ? newGroup : group;

  return (
    <form
      className={`${panel} grid gap-3 sm:grid-cols-2`}
      onSubmit={(e) => {
        e.preventDefault();
        const input: CategoryInput = {
          type,
          group: chosenGroup,
          name,
          budget: parseAmount(amount),
        };
        start(async () => {
          const r = await addCategoryAction(input);
          setResult(r);
          if (r.ok) {
            setGroup("");
            setNewGroup("");
            setName("");
            setAmount("");
            onAdded();
          }
        });
      }}
    >
      <h2 className="text-sm font-semibold sm:col-span-2">Add a category</h2>
      <div>
        <label htmlFor="cat-type" className={label}>
          Type
        </label>
        <select
          id="cat-type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as "Income" | "Expense");
            setGroup("");
          }}
          className={selectClass}
          style={selectStyle}
        >
          <option value="Expense">Expense</option>
          <option value="Income">Income</option>
        </select>
      </div>
      <div>
        <label htmlFor="cat-group" className={label}>
          Group
        </label>
        <select
          id="cat-group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className={selectClass}
          style={selectStyle}
          required
        >
          <option value="">Pick a group</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
          <option value={NEW_GROUP}>New group…</option>
        </select>
        {group === NEW_GROUP && (
          <input
            aria-label="New group name"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="Group name"
            className={`${fieldClass} mt-2`}
            required
          />
        )}
      </div>
      <div>
        <label htmlFor="cat-name" className={label}>
          Name
        </label>
        <input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="cat-budget" className={label}>
          Budget
        </label>
        <input
          id="cat-budget"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Leave blank for none"
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

function CategoryRows({ name, ledger }: { name: string; ledger: LedgerRow[] }) {
  const rows = ledger.filter((r) => r.category === name);
  const roots = rows.filter((r) => !r.parent);
  const children = (id: string) => rows.filter((r) => r.parent === id);
  const orphans = rows.filter(
    (r) => r.parent && !roots.some((p) => p.id === r.parent),
  );
  if (rows.length === 0) {
    return (
      <p className="mt-2 text-xs text-ink/50">Nothing in the ledger yet.</p>
    );
  }
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {[...roots, ...orphans].map((r) => (
        <li key={r.id}>
          <Row row={r} />
          {children(r.id).map((ch) => (
            <div key={ch.id} className="pl-4">
              <Row row={ch} child />
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}

function Row({ row, child }: { row: LedgerRow; child?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${child ? "text-ink/70 italic" : ""}`}
    >
      <span className="min-w-0 truncate">
        <span className="text-ink/40">{row.id} </span>
        {row.item}
        <span className="text-ink/50">
          {row.date ? ` · ${row.date}` : ""} · {row.status}
        </span>
      </span>
      <span className="shrink-0 text-xs tabular-nums">
        {row.actual !== null ? (
          <span>{money(row.actual)}</span>
        ) : (
          <span className="text-ink/50">plan {money(row.budgeted)}</span>
        )}
        {row.actual !== null && row.budgeted !== null && !child && (
          <span className="text-ink/50"> / {money(row.budgeted)}</span>
        )}
      </span>
    </div>
  );
}
