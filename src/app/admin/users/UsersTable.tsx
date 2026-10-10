"use client";

import { useState, useTransition } from "react";
import { setBanned, setRole, type Result } from "./actions";
import { fieldClass, smallButtonClass } from "../ui";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  admin: boolean;
  banned: boolean;
  joined: string;
  /** The viewer's own row has no buttons. */
  self: boolean;
};

export default function UsersTable({
  rows,
  total,
  query,
  truncated,
}: {
  rows: UserRow[];
  total: number;
  query: string;
  truncated: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<Result>) =>
    startTransition(async () => {
      setError((await action()).error ?? null);
    });

  return (
    <div className="space-y-4">
      <form method="get" className="flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by email"
          className={fieldClass}
        />
        <button type="submit" className={smallButtonClass}>
          Search
        </button>
      </form>
      <p className="text-sm text-ink/60">
        {total} {total === 1 ? "account" : "accounts"}
        {query && ` matching “${query}”`}
        {truncated && `, showing the newest ${rows.length}`}
        {error && <span className="ml-3 text-meeple">{error}</span>}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Access</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id} className={u.banned ? "text-ink/50" : ""}>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {u.email}
                  {!u.emailVerified && (
                    <span className="ml-2 text-ink/40">unverified</span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{u.joined}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {u.banned ? (
                    <span className="rounded bg-meeple/10 px-1.5 py-0.5 text-xs font-semibold text-meeple">
                      Banned
                    </span>
                  ) : u.admin ? (
                    <span className="rounded bg-navy/10 px-1.5 py-0.5 text-xs font-semibold text-navy">
                      Admin
                    </span>
                  ) : (
                    <span className="text-ink/50">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {!u.self && (
                    <span className="inline-flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() => setRole(u.id, u.admin ? "user" : "admin"))
                        }
                        className={smallButtonClass}
                      >
                        {u.admin ? "Remove admin" : "Make admin"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => setBanned(u.id, !u.banned))}
                        className={smallButtonClass}
                      >
                        {u.banned ? "Unban" : "Ban"}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/50">
                  No accounts{query && " match"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
