"use client";

import Link from "next/link";
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
import { InfoTip } from "../InfoTip";
import { LevelBadge } from "../PermissionLevel";
import { GROUP_NOTES, permissionGroups, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

const STICKY = "sticky left-0 z-10 bg-white";
const RULE = "border-r border-line";

function RoleDialog({
  role,
  pending,
  onClose,
  onRename,
  onDelete,
}: {
  role: Role;
  pending: boolean;
  onClose: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const n = role.holders.length;
  return (
    <DialogContent className="flex max-w-[520px] flex-col gap-5 px-8 py-7">
      <DialogTitle className="font-bebas text-2xl tracking-wide text-cream">
        {role.name}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Rename or delete the role, and see who holds it.
      </DialogDescription>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get("name") ?? "");
          if (name.trim() && name.trim() !== role.name) onRename(name);
        }}
      >
        <input
          name="name"
          defaultValue={role.name}
          maxLength={40}
          aria-label="Role name"
          className={`${fieldClass} text-ink`}
        />
        <Button type="submit" size="sm" disabled={pending}>
          Rename
        </Button>
      </form>
      <div className="flex items-center gap-3">
        {confirming ? (
          <>
            <span className="text-sm text-cream/80">
              Delete “{role.name}”? {n}{" "}
              {n === 1 ? "person loses" : "people lose"} what it granted.
            </span>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={onDelete}
            >
              Delete role
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Keep
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(true)}
            className="text-salmon"
          >
            Delete role
          </Button>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-xs tracking-wide text-cream/60 uppercase">
          Everyone who has it
        </h3>
        {n === 0 ? (
          <p className="text-sm text-cream/60">Nobody yet.</p>
        ) : (
          <ul className="max-h-64 divide-y divide-cream/10 overflow-y-auto text-sm">
            {role.holders.map((h) => (
              <li key={h.id} className="flex items-baseline gap-3 py-1.5">
                <Link
                  href={`/backstage/users/${h.id}`}
                  onClick={onClose}
                  className="font-semibold text-cream underline-offset-2 hover:underline"
                >
                  {h.name.trim() || "Unnamed"}
                </Link>
                <span className="font-mono text-xs text-cream/60">
                  {h.email}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DialogContent>
  );
}

export default function RolesTool({ roles }: { roles: Role[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = roles.find((r) => r.id === openId) ?? null;

  const run = (action: () => Promise<Result>, then?: () => void) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
      if (!result.error) then?.();
    });

  return (
    <div className="space-y-6">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const name = String(new FormData(form).get("name") ?? "");
          run(
            () => createRole(name),
            () => form.reset(),
          );
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
              <th className={`${STICKY} ${RULE} px-4 py-2 font-medium`}>
                Permission
              </th>
              {roles.map((r) => (
                <th
                  key={r.id}
                  className="w-28 px-3 py-2 text-sm font-semibold whitespace-nowrap text-navy normal-case"
                >
                  {r.auto ? (
                    <span className="inline-flex items-center gap-1">
                      {r.name}
                      <InfoTip label={`About ${r.name}`}>
                        Granted to anyone who {r.auto}.
                      </InfoTip>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenId(r.id)}
                      className="underline decoration-navy/40 decoration-dashed underline-offset-4 hover:text-meeple hover:decoration-meeple"
                    >
                      {r.name}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {permissionGroups().flatMap(({ group, keys }) => [
              <tr key={group}>
                <td
                  colSpan={roles.length + 1}
                  className="sticky left-0 z-10 bg-peach/40 px-4 py-1.5 text-xs font-bold tracking-wide text-navy uppercase"
                >
                  {group}
                  {GROUP_NOTES[group] && (
                    <span className="ml-2 font-normal tracking-normal text-ink/50 normal-case">
                      {GROUP_NOTES[group]}
                    </span>
                  )}
                </td>
              </tr>,
              ...keys.map((key) => {
                const { label, description, level } = PERMISSIONS[key];
                return (
                  <tr key={key}>
                    <td
                      className={`${STICKY} ${RULE} px-4 py-2 whitespace-nowrap`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {label}
                        <InfoTip label={`About ${label}`}>
                          <span className="block font-mono">{key}</span>
                          {description}
                        </InfoTip>
                        <LevelBadge level={level} />
                      </span>
                    </td>
                    {roles.map((r) => (
                      <td key={r.id} className="px-3 py-2 align-top">
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
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <RoleDialog
            key={open.id}
            role={open}
            pending={pending}
            onClose={() => setOpenId(null)}
            onRename={(name) => run(() => renameRole(open.id, name))}
            onDelete={() =>
              run(
                () => deleteRole(open.id),
                () => setOpenId(null),
              )
            }
          />
        )}
      </Dialog>
    </div>
  );
}
