"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { PersonLink, StatusTag, TestTag } from "./parts";
import { fieldClass, selectStyle, smallButtonClass } from "../ui";
import {
  pageOf,
  PAGE_SIZES,
  peopleMatch,
  personLabel,
  sortTicketRows,
  type SortDir,
  type TicketPeople,
  type TicketSort,
} from "@/lib/admin-tickets";
import type { TicketRow } from "@/lib/ticket-store";

export type AdminTicket = {
  t: {
    id: string;
    createdAt: Date;
    claimedAt: Date | null;
    tier: string;
    status: TicketRow["status"];
    test: boolean;
    code: string;
    source: string;
    amountCents: number | null;
  };
  people: TicketPeople;
};

export type TableState = {
  q: string;
  sort: TicketSort;
  dir: SortDir;
  size: number;
  page: number;
};

// "10/21" — the year is always this one.
const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Newest purchases and highest prices first; names A→Z.
const defaultDir = (sort: TicketSort): SortDir =>
  sort === "purchased" || sort === "pay" ? "desc" : "asc";

/** Sorting, search and paging all happen here; the URL just mirrors them. */
export default function TicketsTable({
  tickets,
  initial,
}: {
  tickets: AdminTicket[];
  initial: TableState;
}) {
  const [state, setState] = useState(initial);
  const { q, sort, dir, size } = state;

  const matching = useMemo(
    () =>
      sortTicketRows(
        tickets.filter((r) => peopleMatch(r.people, q)),
        sort,
        dir,
      ),
    [tickets, q, sort, dir],
  );
  const page = pageOf(matching, state.page, size);

  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string, fallback: string) =>
      v === fallback ? url.searchParams.delete(k) : url.searchParams.set(k, v);
    set("q", q, "");
    set("sort", sort, "purchased");
    set("dir", dir, defaultDir(sort));
    set("size", String(size), String(PAGE_SIZES[0]));
    set("page", String(page.page), "1");
    window.history.replaceState(null, "", url);
  }, [q, sort, dir, size, page.page]);

  const update = (next: Partial<TableState>) =>
    setState((s) => ({ ...s, page: 1, ...next }));
  const sortBy = (col: TicketSort) =>
    update(
      sort === col
        ? { dir: dir === "asc" ? "desc" : "asc" }
        : { sort: col, dir: defaultDir(col) },
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search by name or email"
          className={`${fieldClass} max-w-sm`}
        />
        <span className="text-sm text-ink/60">
          {matching.length} {matching.length === 1 ? "ticket" : "tickets"}
        </span>
      </div>

      <div className="rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[5.5rem]" />
            <col className="w-[22%]" />
            <col className="w-[6rem]" />
            <col />
            <col />
          </colgroup>
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              <SortHeader
                col="purchased"
                label="Date"
                {...{ sort, dir, sortBy }}
              />
              <th className="px-4 py-2 font-medium">Ticket</th>
              <SortHeader col="pay" label="Amt" {...{ sort, dir, sortBy }} />
              <SortHeader
                col="buyer"
                label="Buyer"
                {...{ sort, dir, sortBy }}
              />
              <SortHeader
                col="claimer"
                label="Claimer"
                {...{ sort, dir, sortBy }}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-line align-top">
            {page.rows.map(({ t, people }) => (
              <tr key={t.id}>
                <td className="px-4 py-2 whitespace-nowrap">
                  {monthDay.format(t.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <div className="break-words">{t.tier}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusTag status={t.status} />
                    {t.test && <TestTag />}
                    <span className="font-mono text-xs text-ink/60">
                      {t.code}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                  {t.amountCents === null
                    ? "—"
                    : usd.format(t.amountCents / 100)}
                </td>
                <td className="px-4 py-2 break-words">
                  <PersonLink person={people.buyer} />
                  {!people.holderIsBuyer && people.holder && (
                    <div className="mt-1 text-xs text-ink/60">
                      Held by {personLabel(people.holder)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 break-words">
                  <PersonLink person={people.claimer} />
                  {t.claimedAt && (
                    <div className="mt-1 text-xs text-ink/60">
                      Claimed {monthDay.format(t.claimedAt)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {page.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/50">
                  No tickets{q && " match"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          disabled={page.page <= 1}
          onClick={() => setState((s) => ({ ...s, page: page.page - 1 }))}
          className={`${smallButtonClass} disabled:opacity-40`}
        >
          ← Prev
        </button>
        <span className="text-ink/60">
          Page {page.page} of {page.pages}
        </span>
        <button
          type="button"
          disabled={page.page >= page.pages}
          onClick={() => setState((s) => ({ ...s, page: page.page + 1 }))}
          className={`${smallButtonClass} disabled:opacity-40`}
        >
          Next →
        </button>
        <label className="ml-auto flex items-center gap-2 text-ink/60">
          Per page
          <select
            value={size}
            onChange={(e) => update({ size: Number(e.target.value) })}
            className="appearance-none rounded-md border border-line bg-white bg-no-repeat py-1 pr-8 pl-2 text-ink"
            style={selectStyle}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </nav>
    </div>
  );
}

/** A sortable header: a faint ↕ when idle, ↑/↓ when active. */
function SortHeader({
  col,
  label,
  sort,
  dir,
  sortBy,
}: {
  col: TicketSort;
  label: string;
  sort: TicketSort;
  dir: SortDir;
  sortBy: (col: TicketSort) => void;
}) {
  const active = sort === col;
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className="px-4 py-2 font-medium"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => sortBy(col)}
        className={`inline-flex items-center gap-1 uppercase hover:text-navy ${active ? "text-navy" : ""}`}
      >
        {label}
        <Icon
          className={`size-3.5 ${active ? "" : "opacity-40"}`}
          aria-hidden
        />
      </button>
    </th>
  );
}
