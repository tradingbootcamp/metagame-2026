"use client";

import { useState, useTransition } from "react";
import {
  createRole,
  deleteRole,
  renameRole,
  setRolePermission,
  type Result,
} from "./actions";
import { fieldClass, smallButtonClass } from "../ui";
import type { Role } from "@/lib/permission-store";
import { LevelBadge } from "../PermissionLevel";
import { permissionGroups, PERMISSIONS } from "@/lib/permissions";

export default function RolesTool({ roles }: { roles: Role[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<Result>) =>
    startTransition(async () => {
      setError((await action()).error ?? null);
    });

  return (
    <div className="space-y-6">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const name = String(new FormData(form).get("name") ?? "");
          startTransition(async () => {
            const result = await createRole(name);
            setError(result.error ?? null);
            if (!result.error) form.reset();
          });
        }}
      >
        <input
          name="name"
          required
          maxLength={40}
          placeholder="New role, e.g. Volunteer"
          className={fieldClass}
        />
        <button type="submit" disabled={pending} className={smallButtonClass}>
          Create
        </button>
      </form>
      <p className="text-sm text-ink/60">
        Admin accounts hold everything regardless.
        {error && <span className="ml-3 text-meeple">{error}</span>}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="px-4 py-2 font-medium normal-case">
                  <input
                    key={r.name}
                    aria-label="Role name"
                    defaultValue={r.name}
                    maxLength={40}
                    disabled={pending}
                    onBlur={(e) => {
                      const input = e.currentTarget;
                      const name = input.value.trim();
                      if (!name || name === r.name) {
                        input.value = r.name;
                        return;
                      }
                      startTransition(async () => {
                        const result = await renameRole(r.id, name);
                        setError(result.error ?? null);
                        if (result.error) input.value = r.name;
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="w-32 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-navy hover:border-line focus:border-navy focus:outline-none"
                  />
                  <span className="block px-1 text-xs font-normal text-ink/50">
                    {r.members} {r.members === 1 ? "member" : "members"} ·{" "}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (
                          confirm(
                            `Delete “${r.name}”? Its ${r.members} ${r.members === 1 ? "member loses" : "members lose"} what it granted.`,
                          )
                        )
                          run(() => deleteRole(r.id));
                      }}
                      className="hover:text-meeple hover:underline"
                    >
                      delete
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {permissionGroups().flatMap(({ group, keys }) => [
              <tr key={group} className="bg-cream/60">
                <td
                  colSpan={roles.length + 1}
                  className="px-4 py-1.5 text-xs font-semibold tracking-wide text-navy uppercase"
                >
                  {group}
                </td>
              </tr>,
              ...keys.map((key) => {
                const { label, description, level } = PERMISSIONS[key];
                return (
                  <tr key={key}>
                    <td className="px-4 py-2">
                      <span className="font-semibold">{label}</span>
                      <LevelBadge level={level} className="ml-2" />
                      <span className="ml-2 font-mono text-xs text-ink/40">
                        {key}
                      </span>
                      <span className="block text-xs text-ink/60">
                        {description}
                      </span>
                    </td>
                    {roles.map((r) => (
                      <td key={r.id} className="px-4 py-2 align-top">
                        <input
                          type="checkbox"
                          aria-label={`${r.name}: ${label}`}
                          checked={r.permissions.includes(key)}
                          disabled={pending}
                          onChange={(e) => {
                            const on = e.currentTarget.checked;
                            run(() => setRolePermission(r.id, key, on));
                          }}
                          className="size-4 accent-meeple"
                        />
                      </td>
                    ))}
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
        {roles.length === 0 && (
          <p className="px-4 py-6 text-center text-ink/50">
            No roles yet. Create one above.
          </p>
        )}
      </div>
    </div>
  );
}
