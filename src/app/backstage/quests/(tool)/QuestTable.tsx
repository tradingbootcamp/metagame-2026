"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  fieldClass,
  selectClass,
  selectStyle,
  smallButtonClass,
} from "../../ui";
import ActiveToggle from "../ActiveToggle";
import RangeSelectBody from "../RangeSelectBody";

export type QuestRow = {
  id: string;
  code: string;
  title: string;
  background: string;
  needs: string;
  stamps: string;
  pictures: string;
  completions: number;
  active: boolean;
  noEvidence: boolean;
  /** Everything the row shows plus the body text, lowercased, for search. */
  haystack: string;
};

const PRINT_FORM = "print-selected";

export default function QuestTable({ rows }: { rows: QuestRow[] }) {
  const [query, setQuery] = useState("");
  const [background, setBackground] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const shown = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(
      (r) =>
        (!background || r.background === background) &&
        (activeFilter === "" || r.active === (activeFilter === "1")) &&
        terms.every((t) => r.haystack.includes(t)),
    );
  }, [rows, query, background, activeFilter]);

  const activeCount = shown.filter((r) => r.active).length;
  const printAll = new URLSearchParams({ active: "1" });
  if (background) printAll.set("class", background);
  const filtered = query.trim() !== "" || background || activeFilter;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-bebas text-3xl tracking-wide text-navy">
          Quests{" "}
          <span className="text-ink/50">
            ({filtered ? `${shown.length} of ${rows.length}` : rows.length})
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search title, text, code…"
            aria-label="Search quests"
            className={`${fieldClass} w-56`}
          />
          <select
            value={background}
            onChange={(e) => setBackground(e.currentTarget.value)}
            aria-label="Filter by background"
            className={selectClass}
            style={selectStyle}
          >
            <option value="">All backgrounds</option>
            <option value="wizard">Wizard</option>
            <option value="pirate">Pirate</option>
            <option value="alien">Alien</option>
            <option value="star">Star (any class)</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.currentTarget.value)}
            aria-label="Filter by active"
            className={selectClass}
            style={selectStyle}
          >
            <option value="">Active + withdrawn</option>
            <option value="1">Active only</option>
            <option value="0">Withdrawn only</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* The row checkboxes point at this form; the rows hold their own
            Active forms, so the table can't sit inside it. */}
        <form
          id={PRINT_FORM}
          method="get"
          action="/backstage/quests/print"
          target="_blank"
          className="flex flex-wrap items-center gap-2"
        >
          <button className={smallButtonClass}>Print selected</button>
          <Link
            href={`/backstage/quests/print?${printAll}`}
            target="_blank"
            className={smallButtonClass}
          >
            Print all active{background ? ` ${background}` : ""} ({activeCount})
          </Link>
          <span className="text-xs text-ink/60">
            Opens a page with one US Letter card per quest; print it from the
            browser.
          </span>
        </form>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream text-left text-xs tracking-wide text-ink/60 uppercase">
              <tr>
                <th className="p-2" />
                <th className="p-2">Code</th>
                <th className="p-2">Title</th>
                <th className="p-2">Needs</th>
                <th className="p-2">Stamps</th>
                <th className="p-2">Pictures</th>
                <th className="p-2">Done</th>
                <th className="p-2">Active</th>
                <th className="p-2" />
              </tr>
            </thead>
            <RangeSelectBody className="divide-y divide-line">
              {shown.map((r) => (
                <Row key={r.id} row={r} />
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-ink/60">
                    No quests match.{" "}
                    <Link
                      href="/backstage/quests/new"
                      className="text-navy underline"
                    >
                      Add some.
                    </Link>
                  </td>
                </tr>
              )}
            </RangeSelectBody>
          </table>
        </div>
      </div>
    </>
  );
}

function Row({ row }: { row: QuestRow }) {
  const href = `/backstage/quests/${row.id}`;
  return (
    <tr className={row.active ? "" : "text-ink/50"}>
      <td className="p-2">
        <input
          type="checkbox"
          name="id"
          value={row.id}
          form={PRINT_FORM}
          aria-label={`Select ${row.title}`}
        />
      </td>
      <td className="p-2 font-mono whitespace-nowrap">
        <Link href={href} className="hover:text-meeple">
          {row.code}
        </Link>
      </td>
      <td className="p-2">
        <Link href={href} className="font-medium text-navy hover:text-meeple">
          {row.title}
        </Link>
        {row.noEvidence && (
          <span className="ml-2 rounded bg-meeple/10 px-1.5 py-0.5 text-xs text-meeple">
            no evidence
          </span>
        )}
      </td>
      <td className="p-2 whitespace-nowrap">{row.needs}</td>
      <td className="p-2 whitespace-nowrap">{row.stamps}</td>
      <td className="p-2 tabular-nums">{row.pictures}</td>
      <td className="p-2 tabular-nums">{row.completions}</td>
      <td className="p-2">
        <ActiveToggle id={row.id} active={row.active} />
      </td>
      <td className="p-2 whitespace-nowrap">
        <Link href={href} className="text-navy underline underline-offset-2">
          Edit
        </Link>{" "}
        <Link
          href={`/backstage/quests/print?id=${row.id}`}
          target="_blank"
          className="ml-2 text-navy underline underline-offset-2"
        >
          Print
        </Link>
      </td>
    </tr>
  );
}
