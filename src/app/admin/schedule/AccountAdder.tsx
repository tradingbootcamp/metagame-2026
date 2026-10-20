"use client";

import { useEffect, useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { addAccount, findAccounts } from "./actions";
import { fieldClass, smallButtonClass } from "../ui";
import type { ScheduleAccount } from "@/lib/schedule";

// Enter in these inputs would submit the session form; Escape would close the dialog.
function trapKeys(
  e: React.KeyboardEvent,
  onEnter: () => void,
  onEscape: () => void,
) {
  if (e.key === "Enter") {
    e.preventDefault();
    onEnter();
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    onEscape();
  }
}

/**
 * "+ label" that opens an account search; the last result offers to make an
 * account by name and email.
 */
export default function AccountAdder({
  label,
  exclude,
  onPick,
}: {
  label: string;
  /** User ids already chosen, left out of the results. */
  exclude: string[];
  onPick: (account: ScheduleAccount) => void;
}) {
  const [mode, setMode] = useState<"idle" | "search" | "new">("idle");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScheduleAccount[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();

  useEffect(() => {
    if (mode !== "search") return;
    let live = true;
    const t = setTimeout(async () => {
      const found = await findAccounts(query);
      if (live) setResults(found);
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, mode]);

  const close = () => {
    setMode("idle");
    setQuery("");
    setResults([]);
    setNewError(null);
  };

  const add = (account: ScheduleAccount) => {
    onPick(account);
    close();
  };

  const startNew = () => {
    const q = query.trim();
    setNewName(q.includes("@") ? "" : q);
    setNewEmail(q.includes("@") ? q : "");
    setMode("new");
  };

  const create = () =>
    startCreate(async () => {
      const res = await addAccount(newName, newEmail);
      if (res.account) add(res.account);
      else setNewError(res.error);
    });

  const shown = results.filter((r) => !exclude.includes(r.userId));

  return (
    <>
      {mode === "idle" && (
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`${smallButtonClass} inline-flex items-center gap-1`}
        >
          <PlusIcon className="size-4" /> {label}
        </button>
      )}

      {mode === "search" && (
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) =>
              trapKeys(
                e,
                () => (shown[0] ? add(shown[0]) : query.trim() && startNew()),
                close,
              )
            }
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget))
                close();
            }}
            placeholder="Search by name or email"
            className={fieldClass}
          />
          {query.trim().length >= 2 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-md">
              {shown.map((r) => (
                <li key={r.userId}>
                  <button
                    type="button"
                    onClick={() => add(r)}
                    className="block w-full px-3 py-2 text-left hover:bg-ink/5"
                  >
                    <span className="font-medium text-ink">{r.name}</span>
                    {r.name !== r.email && (
                      <span className="ml-2 text-xs text-ink/50">
                        {r.email}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={startNew}
                  className="flex w-full items-center gap-1 border-t border-line px-3 py-2 text-left text-navy hover:bg-ink/5"
                >
                  <PlusIcon className="size-4" /> New account “{query.trim()}”…
                </button>
              </li>
            </ul>
          )}
        </div>
      )}

      {mode === "new" && (
        <div className="rounded-lg border border-line p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => trapKeys(e, create, close)}
              placeholder="Name"
              className={fieldClass}
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => trapKeys(e, create, close)}
              placeholder="Email"
              className={fieldClass}
            />
          </div>
          <p className="mt-2 text-xs text-ink/50">
            Makes an account for this email if there isn’t one. It’s theirs once
            they sign in with it.
          </p>
          {newError && <p className="mt-1 text-xs text-meeple">{newError}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={creating}
              className={smallButtonClass}
            >
              {creating ? "Adding…" : "Add"}
            </button>
            <button type="button" onClick={close} className={smallButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
