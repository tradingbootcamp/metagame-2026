"use client";

import { useState, useTransition } from "react";
import { setAdmin } from "./actions";
import { fieldClass, smallButtonClass } from "../ui";

type Person = { id: string; name: string; email: string };

const MATCHES = 6;

export default function AdminsPane({
  admins,
  accounts,
  selfId,
}: {
  admins: Person[];
  accounts: Person[];
  selfId: string;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const adminIds = new Set(admins.map((a) => a.id));
  const q = query.trim().toLowerCase();
  const matches = q
    ? accounts
        .filter(
          (a) =>
            !adminIds.has(a.id) &&
            (a.name.toLowerCase().includes(q) ||
              a.email.toLowerCase().includes(q)),
        )
        .slice(0, MATCHES)
    : [];

  const change = (id: string, admin: boolean) => {
    setError(null);
    start(async () => {
      const result = await setAdmin(id, admin);
      if (result.error) setError(result.error);
      else if (admin) setQuery("");
    });
  };

  return (
    <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
      <h2 className="font-bebas text-2xl tracking-wide text-navy">Admins</h2>
      <p className="mt-1 text-sm text-ink/70">
        Everyone with the Magnum Opus Admin role can use this page, and is
        listed as someone to hand tokens to. Any of them can add or remove
        others.
      </p>

      {admins.length === 0 ? (
        <p className="mt-4 text-sm text-ink/60">Nobody has the role yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center gap-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-navy">
                  {a.name.trim() || "Unnamed"}
                </span>
                {a.email && (
                  <span className="block truncate text-sm text-ink/60">
                    {a.email}
                  </span>
                )}
              </span>
              {a.id === selfId ? (
                <span className="text-sm text-ink/50">You</span>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => change(a.id, false)}
                  className={smallButtonClass}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Add someone: search by name"
        aria-label="Search for someone to add"
        className={`${fieldClass} mt-4`}
      />
      {q && (
        <ul className="mt-2 divide-y divide-line">
          {matches.length === 0 ? (
            <li className="py-2 text-sm text-ink/60">No one else matches.</li>
          ) : (
            matches.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy">
                    {a.name.trim() || "Unnamed"}
                  </span>
                  {a.email && (
                    <span className="block truncate text-sm text-ink/60">
                      {a.email}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => change(a.id, true)}
                  className={smallButtonClass}
                >
                  Add
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
