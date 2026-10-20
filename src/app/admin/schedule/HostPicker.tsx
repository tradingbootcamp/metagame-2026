"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowUpIcon, PlusIcon, XIcon } from "lucide-react";
import { addHost, findHosts } from "./actions";
import { fieldClass, smallButtonClass } from "../ui";
import type { ScheduleHost } from "@/lib/schedule";

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

export default function HostPicker({
  initial,
  error,
}: {
  initial: ScheduleHost[];
  error?: string | null;
}) {
  const [hosts, setHosts] = useState(initial);
  const [mode, setMode] = useState<"idle" | "search" | "new">("idle");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScheduleHost[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();

  useEffect(() => {
    if (mode !== "search") return;
    let live = true;
    const t = setTimeout(async () => {
      const found = await findHosts(query);
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

  const add = (host: ScheduleHost) => {
    setHosts((hs) =>
      hs.some((h) => h.userId === host.userId) ? hs : [...hs, host],
    );
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
      const res = await addHost(newName, newEmail);
      if (res.host) add(res.host);
      else setNewError(res.error);
    });

  const moveUp = (i: number) =>
    setHosts((hs) => {
      const next = [...hs];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });

  const shown = results.filter(
    (r) => !hosts.some((h) => h.userId === r.userId),
  );

  return (
    <div className="text-sm sm:col-span-2">
      <span className="mb-1 block font-medium text-ink/80">Hosts</span>
      {hosts.map((h) => (
        <input key={h.userId} type="hidden" name="hostId" value={h.userId} />
      ))}

      {hosts.length > 0 && (
        <ul className="mb-2 divide-y divide-line rounded-lg border border-line">
          {hosts.map((h, i) => (
            <li key={h.userId} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-ink">{h.name}</span>
                {i === 0 && hosts.length > 1 && (
                  <span className="ml-2 rounded bg-navy/10 px-1.5 py-0.5 text-xs text-navy">
                    Lead
                  </span>
                )}
                {h.name !== h.email && (
                  <span className="block truncate text-xs text-ink/50">
                    {h.email}
                  </span>
                )}
              </div>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => moveUp(i)}
                  aria-label={`Move ${h.name} up`}
                  title="Move up"
                  className="rounded p-1 text-ink/40 hover:text-navy"
                >
                  <ArrowUpIcon className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setHosts((hs) => hs.filter((x) => x.userId !== h.userId))
                }
                aria-label={`Remove ${h.name}`}
                title="Remove"
                className="rounded p-1 text-ink/40 hover:text-meeple"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === "idle" && (
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`${smallButtonClass} inline-flex items-center gap-1`}
        >
          <PlusIcon className="size-4" /> Add host
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
                  <PlusIcon className="size-4" /> New host “{query.trim()}”…
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

      {error && <span className="mt-1 block text-xs text-meeple">{error}</span>}
    </div>
  );
}
