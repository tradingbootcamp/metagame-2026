"use client";

import { useMemo, useState, useTransition } from "react";
import { accountRecord, changeBalance, type RecordRow } from "./actions";
import { pacific } from "./pacific";
import { fieldClass } from "../ui";
import { isDelta, loanIncreasesSinceZero } from "@/lib/magnum-opus";

export type AccountRow = {
  id: string;
  name: string;
  email: string;
  tokens: number;
  loanTokens: number;
};

type SortKey = "name" | "tokens" | "loanTokens";
type Sort = { key: SortKey; dir: "asc" | "desc" };

const SHOWN = 50;

const signed = (n: number) => (n > 0 ? `+${n}` : n === 0 ? "" : String(n));

export default function AccountsPane({
  rows,
  selfId,
}: {
  /** email is blank unless the viewer may see emails. */
  rows: AccountRow[];
  selfId: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "name", dir: "asc" });
  const [selected, setSelected] = useState<string | null>(null);
  // Tagged with whose it is, so a slow reply for one account never shows under another.
  const [record, setRecord] = useState<{
    id: string;
    rows: RecordRow[];
  } | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const loadRecord = (id: string) =>
    startLoading(async () => {
      const result = await accountRecord(id);
      if (result.error) setRecordError(result.error);
      else {
        setRecordError(null);
        setRecord({ id, rows: result.rows ?? [] });
      }
    });

  const toggle = (id: string) => {
    if (selected === id) {
      setSelected(null);
      return;
    }
    setSelected(id);
    loadRecord(id);
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q),
        )
      : rows;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...matches].sort((a, b) => {
      const by =
        sort.key === "name"
          ? a.name.localeCompare(b.name)
          : a[sort.key] - b[sort.key];
      return sign * by || a.name.localeCompare(b.name);
    });
  }, [rows, query, sort]);

  // Names read A→Z first; counts read biggest first.
  const sortBy = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    );

  return (
    <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
      <h2 className="font-bebas text-2xl tracking-wide text-navy">Accounts</h2>
      <p className="mt-1 text-sm text-ink/70">
        Everyone&rsquo;s tokens and loan. Open someone to change their balances
        or see every change to them. A loan can go past someone&rsquo;s
        borrowing limit, but not below 0.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by name"
        aria-label="Filter accounts"
        className={`${fieldClass} mt-4`}
      />

      <div className="mt-3 flex items-center gap-4 border-b border-line px-1 pb-2 text-sm text-ink/60">
        <SortButton label="Name" k="name" sort={sort} onSort={sortBy} grow />
        <SortButton label="Tokens" k="tokens" sort={sort} onSort={sortBy} />
        <SortButton label="Loan" k="loanTokens" sort={sort} onSort={sortBy} />
      </div>

      <ul className="divide-y divide-line">
        {shown.slice(0, SHOWN).map((r) => (
          <li key={r.id}>
            <button
              type="button"
              aria-expanded={selected === r.id}
              onClick={() => toggle(r.id)}
              className="flex w-full items-center gap-4 px-1 py-3 text-left transition-colors hover:bg-cream aria-expanded:bg-cream"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-navy">{r.name}</span>
                {r.email && (
                  <span className="block truncate text-sm text-ink/60">
                    {r.email}
                  </span>
                )}
              </span>
              <span className="w-16 text-right font-semibold text-navy tabular-nums">
                {r.tokens}
              </span>
              <span
                className={`w-16 text-right font-semibold tabular-nums ${r.loanTokens > 0 ? "text-meeple" : "text-ink/40"}`}
              >
                {r.loanTokens}
              </span>
            </button>
            {selected === r.id && (
              <Detail
                row={r}
                self={r.id === selfId}
                record={record?.id === r.id ? record.rows : null}
                loading={loading}
                error={recordError}
                onApplied={() => loadRecord(r.id)}
              />
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-ink/50">
        {shown.length === 0
          ? "No accounts match."
          : shown.length > SHOWN
            ? `Showing ${SHOWN} of ${shown.length}; filter to narrow it down.`
            : null}
      </p>
    </section>
  );
}

function SortButton({
  label,
  k,
  sort,
  onSort,
  grow,
}: {
  label: string;
  k: SortKey;
  sort: Sort;
  onSort: (k: SortKey) => void;
  grow?: boolean;
}) {
  const active = sort.key === k;
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      aria-label={`Sort by ${label.toLowerCase()}`}
      aria-pressed={active}
      className={`${grow ? "flex-1 text-left" : "w-16 text-right"} hover:text-navy ${active ? "font-semibold text-navy" : ""}`}
    >
      {label}
      {active && (sort.dir === "asc" ? " ↑" : " ↓")}
    </button>
  );
}

/** The open account: its change form and full record. */
function Detail({
  row,
  self,
  record,
  loading,
  error,
  onApplied,
}: {
  row: AccountRow;
  self: boolean;
  record: RecordRow[] | null;
  loading: boolean;
  error: string | null;
  onApplied: () => void;
}) {
  const owingSince =
    record && row.loanTokens > 0
      ? loanIncreasesSinceZero(row.loanTokens, record)[0]?.at
      : undefined;

  return (
    <div className="flex flex-col gap-4 bg-cream px-1 pt-1 pb-4">
      {self ? (
        <p className="text-sm text-ink/70">
          This is you: someone else has to change your balance.
        </p>
      ) : (
        <ChangeForm row={row} onApplied={onApplied} />
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {owingSince !== undefined && (
        <p className="text-sm text-ink/70">
          Owing since {pacific(owingSince)}.
        </p>
      )}
      {record === null ? (
        <p className="text-sm text-ink/50">
          {loading ? "Loading record…" : ""}
        </p>
      ) : record.length === 0 ? (
        <p className="text-sm text-ink/50">No changes recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-ink/60">
              <tr className="border-b border-line">
                <th className="px-3 py-2 font-normal">When</th>
                <th className="px-3 py-2 text-right font-normal">Tokens</th>
                <th className="px-3 py-2 text-right font-normal">Loan</th>
                <th className="px-3 py-2 font-normal">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {record.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-ink/70">
                    {pacific(e.at)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-navy tabular-nums">
                    {signed(e.tokensDelta)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-meeple tabular-nums">
                    {signed(e.loanDelta)}
                  </td>
                  <td className="px-3 py-2 text-ink/70">
                    {e.kind === "loan"
                      ? "Borrowed"
                      : (e.by ?? "A deleted account")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChangeForm({
  row,
  onApplied,
}: {
  row: AccountRow;
  onApplied: () => void;
}) {
  const [tokens, setTokens] = useState("");
  const [loan, setLoan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tokens.trim() === "" ? 0 : Number(tokens);
    const l = loan.trim() === "" ? 0 : Number(loan);
    if (!isDelta(t) || !isDelta(l)) {
      setError("Changes must be whole numbers.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await changeBalance(row.id, t, l);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTokens("");
      setLoan("");
      onApplied();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <label className="flex flex-col gap-1 text-sm text-ink/70">
        Tokens ±
        <input
          type="number"
          step={1}
          inputMode="numeric"
          value={tokens}
          onChange={(e) => setTokens(e.target.value)}
          placeholder="0"
          className={`${fieldClass} sm:w-32`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink/70">
        Loan ±
        <input
          type="number"
          step={1}
          inputMode="numeric"
          value={loan}
          onChange={(e) => setLoan(e.target.value)}
          placeholder="0"
          className={`${fieldClass} sm:w-32`}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-meeple px-4 py-2 font-semibold text-white transition-colors hover:bg-meeple-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Apply"}
      </button>
      {error && <p className="text-sm text-red-700 sm:self-center">{error}</p>}
    </form>
  );
}
