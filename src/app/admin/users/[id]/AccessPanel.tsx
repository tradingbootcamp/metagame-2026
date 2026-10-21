"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { assignRole, setOverride, type Result } from "./actions";
import { selectClass, selectStyle } from "../../ui";
import {
  describeSource,
  PERMISSION_KEYS,
  PERMISSIONS,
  type Explanation,
  type OverrideEffect,
  type Permission,
} from "@/lib/permissions";

export type AccessView = {
  userId: string;
  admin: boolean;
  /** The viewer's own page: shown, not editable. */
  self: boolean;
  roles: { id: string; name: string; assigned: boolean }[];
  overrides: Partial<Record<Permission, OverrideEffect>>;
  explanation: Record<Permission, Explanation>;
};

const OVERRIDES = [
  { value: "", label: "Inherit" },
  { value: "grant", label: "Grant" },
  { value: "deny", label: "Deny" },
];

export default function AccessPanel({ access }: { access: AccessView }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = pending || access.self;

  const run = (action: () => Promise<Result>) =>
    startTransition(async () => {
      setError((await action()).error ?? null);
    });

  return (
    <div className="space-y-5 text-sm">
      {access.admin && (
        <p className="rounded-lg bg-navy/5 px-3 py-2 text-navy">
          Admin accounts hold every permission; the roles and overrides below
          are kept but don’t apply until the admin role is removed.
        </p>
      )}
      {access.self && (
        <p className="text-ink/60">Your own access is read-only here.</p>
      )}
      {error && <p className="text-meeple">{error}</p>}

      <div>
        <h3 className="mb-1 font-semibold">Roles</h3>
        {access.roles.length === 0 ? (
          <p className="text-ink/50">
            No roles exist yet.{" "}
            <Link
              href="/admin/roles"
              className="text-navy hover:text-meeple hover:underline"
            >
              Create one
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {access.roles.map((r) => (
              <li key={r.id}>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={r.assigned}
                    disabled={locked}
                    onChange={(e) => {
                      const on = e.currentTarget.checked;
                      run(() => assignRole(access.userId, r.id, on));
                    }}
                    className="size-4 accent-meeple"
                  />
                  {r.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left">
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Permission</th>
              <th className="px-3 py-2 font-medium">Effective</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PERMISSION_KEYS.map((key) => {
              const { effective, sources } = access.explanation[key];
              return (
                <tr key={key} className={effective ? "" : "text-ink/50"}>
                  <td className="px-3 py-2">
                    <span className="font-semibold">
                      {PERMISSIONS[key].label}
                    </span>
                    <span className="ml-2 font-mono text-xs text-ink/40">
                      {key}
                    </span>
                  </td>
                  <td className="px-3 py-2">{effective ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-xs">
                    {sources.length === 0
                      ? "—"
                      : sources.map(describeSource).join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`${PERMISSIONS[key].label} override`}
                      value={access.overrides[key] ?? ""}
                      disabled={locked}
                      onChange={(e) => {
                        const v = e.currentTarget.value as OverrideEffect | "";
                        run(() => setOverride(access.userId, key, v || null));
                      }}
                      className={selectClass}
                      style={selectStyle}
                    >
                      {OVERRIDES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
