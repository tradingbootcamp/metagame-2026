"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { assignRole, setGrant, type Result } from "./actions";
import { LevelBadge } from "../../PermissionLevel";
import {
  describeSource,
  overrideConflict,
  permissionGroups,
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
  /** The viewer holds users.edit and this isn't their own page. */
  editable: boolean;
  roles: { id: string; name: string; assigned: boolean }[];
  /** Built-in roles this account holds automatically, e.g. "Attendee (has a ticket)". */
  auto: string[];
  grants: Permission[];
  denies: Permission[];
  explanation: Record<Permission, Explanation>;
};

const CHOICES: { effect: OverrideEffect | null; label: string }[] = [
  { effect: null, label: "Inherit" },
  { effect: "allow", label: "Allow" },
  { effect: "deny", label: "Deny" },
];

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
          Admin accounts hold every permission; the roles, grants and denies
          below are kept but don’t apply until the admin role is removed.
        </p>
      )}
      {access.self ? (
        <p className="text-ink/60">Your own access is read-only here.</p>
      ) : (
        !access.editable && (
          <p className="text-ink/60">
            Read-only: changing roles and overrides needs the “
            {PERMISSIONS["users.edit"].label}” permission.
          </p>
        )
      )}
      {error && <p className="text-meeple">{error}</p>}

      <div>
        <h3 className="mb-1 font-semibold">Roles</h3>
        {access.auto.length > 0 && (
          <p className="mb-2 text-ink/60">
            Automatic: {access.auto.join(", ")}
          </p>
        )}
        {access.roles.length === 0 ? (
          <p className="text-ink/50">
            No roles exist yet.{" "}
            <Link
              href="/backstage/roles"
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
                const current: OverrideEffect | null = access.grants.includes(
                  key,
                )
                  ? "allow"
                  : access.denies.includes(key)
                    ? "deny"
                    : null;
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
                      <div
                        role="group"
                        aria-label={`Override for ${PERMISSIONS[key].label}`}
                        className="inline-flex overflow-hidden rounded-md border border-line bg-white"
                      >
                        {CHOICES.map(({ effect, label }, i) => {
                          const active = current === effect;
                          const conflict =
                            effect && !active
                              ? overrideConflict(access, key, effect)
                              : null;
                          return (
                            <button
                              key={label}
                              type="button"
                              aria-pressed={active}
                              title={conflict ?? undefined}
                              disabled={locked || conflict !== null}
                              onClick={() => {
                                if (!active)
                                  run(() =>
                                    setGrant(access.userId, key, effect),
                                  );
                              }}
                              className={`px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                                active
                                  ? effect === "deny"
                                    ? "bg-meeple text-white"
                                    : "bg-navy text-white"
                                  : "text-ink/70 enabled:hover:bg-ink/5 disabled:text-ink/30"
                              } ${i > 0 ? "border-l border-line" : ""}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
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
