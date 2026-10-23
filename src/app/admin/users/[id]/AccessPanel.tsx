"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { assignRole, setGrant, type Result } from "./actions";
import { LevelBadge } from "../../PermissionLevel";
import {
  describeSource,
  permissionGroups,
  PERMISSIONS,
  type Explanation,
  type Permission,
} from "@/lib/permissions";

export type AccessView = {
  userId: string;
  admin: boolean;
  /** The viewer's own page: shown, not editable. */
  self: boolean;
  /** The viewer holds users.edit and this isn't their own page. */
  editable: boolean;
  roles: { id: string; name: string; assigned: boolean }[];
  grants: Permission[];
  explanation: Record<Permission, Explanation>;
};

export default function AccessPanel({ access }: { access: AccessView }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = pending || !access.editable;

  const run = (action: () => Promise<Result>) =>
    startTransition(async () => {
      setError((await action()).error ?? null);
    });

  return (
    <div className="space-y-5 text-sm">
      {access.admin && (
        <p className="rounded-lg bg-navy/5 px-3 py-2 text-navy">
          Admin accounts hold every permission; the roles and grants below are
          kept but don’t apply until the admin role is removed.
        </p>
      )}
      {access.self ? (
        <p className="text-ink/60">Your own access is read-only here.</p>
      ) : (
        !access.editable && (
          <p className="text-ink/60">
            Read-only: changing roles and grants needs the “Users: edit access”
            permission.
          </p>
        )
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
              <th className="px-3 py-2 font-medium">Grant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {permissionGroups().flatMap(({ group, keys }) => [
              <tr key={group} className="bg-cream/60">
                <td
                  colSpan={4}
                  className="px-3 py-1.5 text-xs font-semibold tracking-wide text-navy uppercase"
                >
                  {group}
                </td>
              </tr>,
              ...keys.map((key) => {
                const { effective, sources } = access.explanation[key];
                return (
                  <tr key={key} className={effective ? "" : "text-ink/50"}>
                    <td className="px-3 py-2">
                      <span className="font-semibold">
                        {PERMISSIONS[key].label}
                      </span>
                      <LevelBadge
                        level={PERMISSIONS[key].level}
                        className="ml-2"
                      />
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
                      <input
                        type="checkbox"
                        aria-label={`Grant ${PERMISSIONS[key].label}`}
                        checked={access.grants.includes(key)}
                        disabled={locked}
                        onChange={(e) => {
                          const on = e.currentTarget.checked;
                          run(() => setGrant(access.userId, key, on));
                        }}
                        className="size-4 accent-meeple"
                      />
                    </td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
      </div>
    </div>
  );
}
