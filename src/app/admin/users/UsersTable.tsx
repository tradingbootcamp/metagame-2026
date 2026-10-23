"use client";

import { ChevronDownIcon, ShieldCheckIcon, TicketIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { removeUser, setBanned, setRole, type Result } from "./actions";
import { assignRole } from "./[id]/actions";
import { fieldClass, smallButtonClass } from "../ui";
import { ticketBadge } from "@/lib/admin-tickets";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

export type RoleOption = { id: string; name: string };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  admin: boolean;
  roles: RoleOption[];
  banned: boolean;
  joined: string;
  /** The viewer's own row has no buttons. */
  self: boolean;
  /** Tickets they've claimed. */
  tickets: number;
};

function TicketCell({ id, count }: { id: string; count: number }) {
  const { has, label } = ticketBadge(count);
  return (
    <Link
      href={`/admin/tickets?user=${encodeURIComponent(id)}`}
      title={has ? `${count} claimed` : "No claimed ticket"}
      className={`inline-flex items-center gap-1 hover:text-meeple ${has ? "text-navy" : "text-ink/25"}`}
    >
      <TicketIcon className="size-4" aria-label="Tickets" />
      {label && <span className="text-xs font-semibold">{label}</span>}
    </Link>
  );
}

function AdminShield() {
  return (
    <span title="Admin" className="inline-flex">
      <ShieldCheckIcon className="size-4 text-navy" aria-label="Admin" />
    </span>
  );
}

export default function UsersTable({
  rows,
  total,
  query,
  truncated,
  allRoles,
  viewerIsAdmin,
  viewerCanEdit,
  viewerCanDelete,
}: {
  rows: UserRow[];
  total: number;
  query: string;
  truncated: boolean;
  /** Assignable roles; built-in ones attach themselves and aren't listed. */
  allRoles: RoleOption[];
  /** Only `user.role = 'admin'` accounts may change the admin role and bans. */
  viewerIsAdmin: boolean;
  /** `users.edit`: assign and remove roles. */
  viewerCanEdit: boolean;
  /** `users.delete`; deleting an admin account still needs an admin. */
  viewerCanDelete: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [promoting, setPromoting] = useState<UserRow | null>(null);
  const [openRoles, setOpenRoles] = useState<string | null>(null);

  const run = (action: () => Promise<Result>) =>
    startTransition(async () => {
      setError((await action()).error ?? null);
    });

  const canPickRoles = viewerCanEdit || viewerIsAdmin;

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
              <th className="px-4 py-2 font-medium">Ticket</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Roles</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => {
              const names = u.roles.map((r) => r.name).join(", ");
              const pickable = canPickRoles && !u.self;
              return (
                <tr key={u.id} className={u.banned ? "text-ink/50" : ""}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-navy underline-offset-2 hover:text-meeple hover:underline"
                    >
                      {u.name.trim() || "Unnamed"}
                    </Link>
                    {u.banned && (
                      <span className="ml-2 rounded bg-meeple/10 px-1.5 py-0.5 text-xs font-semibold text-meeple">
                        Banned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {u.email}
                    {!u.emailVerified && (
                      <span className="ml-2 text-ink/40">unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <TicketCell id={u.id} count={u.tickets} />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{u.joined}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {u.admin && <AdminShield />}
                      {pickable ? (
                        <span className="relative">
                          <button
                            type="button"
                            disabled={pending}
                            aria-haspopup="menu"
                            aria-expanded={openRoles === u.id}
                            onClick={() =>
                              setOpenRoles(openRoles === u.id ? null : u.id)
                            }
                            className={`${smallButtonClass} inline-flex items-center gap-1 ${names ? "" : "text-ink/50"}`}
                          >
                            {names || "No roles"}
                            <ChevronDownIcon className="size-3.5" />
                          </button>
                          {openRoles === u.id && (
                            <>
                              <button
                                type="button"
                                aria-label="Close"
                                onClick={() => setOpenRoles(null)}
                                className="fixed inset-0 z-10 cursor-default"
                              />
                              <div
                                role="menu"
                                className="absolute left-0 z-20 mt-1 min-w-48 rounded-lg border border-line bg-white p-2 text-left shadow-lg"
                              >
                                {viewerIsAdmin && (
                                  <label className="flex items-center gap-2 rounded px-2 py-1 hover:bg-cream">
                                    <input
                                      type="checkbox"
                                      checked={u.admin}
                                      disabled={pending}
                                      onChange={(e) => {
                                        if (e.currentTarget.checked) {
                                          setOpenRoles(null);
                                          setPromoting(u);
                                        } else {
                                          run(() => setRole(u.id, "user"));
                                        }
                                      }}
                                      className="size-4 accent-meeple"
                                    />
                                    <span className="font-semibold text-navy">
                                      Admin
                                    </span>
                                    <span className="text-xs text-ink/50">
                                      everything
                                    </span>
                                  </label>
                                )}
                                {allRoles.map((r) => (
                                  <label
                                    key={r.id}
                                    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-cream"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={u.roles.some(
                                        (h) => h.id === r.id,
                                      )}
                                      disabled={pending || !viewerCanEdit}
                                      onChange={(e) => {
                                        const on = e.currentTarget.checked;
                                        run(() => assignRole(u.id, r.id, on));
                                      }}
                                      className="size-4 accent-meeple"
                                    />
                                    {r.name}
                                  </label>
                                ))}
                                {allRoles.length === 0 && (
                                  <p className="px-2 py-1 text-xs text-ink/50">
                                    No roles yet.{" "}
                                    <Link
                                      href="/admin/roles"
                                      className="text-navy hover:underline"
                                    >
                                      Create one
                                    </Link>
                                    .
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </span>
                      ) : (
                        <span className={names ? "" : "text-ink/50"}>
                          {names || "—"}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {!u.self && (viewerIsAdmin || viewerCanDelete) && (
                      <span className="inline-flex gap-2">
                        {viewerIsAdmin && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(() => setBanned(u.id, !u.banned))
                            }
                            className={smallButtonClass}
                          >
                            {u.banned ? "Unban" : "Ban"}
                          </button>
                        )}
                        {viewerCanDelete && (viewerIsAdmin || !u.admin) && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setDeleting(u)}
                            className={`${smallButtonClass} hover:border-meeple hover:text-meeple`}
                          >
                            Delete
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                  No accounts{query && " match"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Dialog
        open={promoting !== null}
        onOpenChange={(o) => !o && setPromoting(null)}
      >
        <DialogContent className="flex max-w-[480px] flex-col gap-5 px-8 py-7">
          <DialogTitle className="font-bebas text-2xl tracking-wide text-cream">
            Make this person an admin?
          </DialogTitle>
          <DialogDescription className="text-base text-cream/80">
            <span className="font-semibold text-cream">{promoting?.email}</span>{" "}
            would hold every permission: grant and revoke admin, ban and delete
            accounts, and everything the roles cover. For anything less than all
            of it, give them a role instead.
          </DialogDescription>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPromoting(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (!promoting) return;
                const { id } = promoting;
                setPromoting(null);
                run(() => setRole(id, "admin"));
              }}
            >
              Make admin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent className="flex max-w-[480px] flex-col gap-5 px-8 py-7">
          <DialogTitle className="font-bebas text-2xl tracking-wide text-cream">
            Delete this account?
          </DialogTitle>
          <DialogDescription className="text-base text-cream/80">
            This{" "}
            <span className="font-bold text-salmon underline">
              permanently deletes
            </span>{" "}
            <span className="font-semibold text-cream">{deleting?.email}</span>{" "}
            and everything attached to it: their profile, sessions, and sign-in
            methods. There is no undo. To keep the account but lock them out,
            use Ban instead.
          </DialogDescription>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (!deleting) return;
                const { id } = deleting;
                setDeleting(null);
                run(() => removeUser(id));
              }}
            >
              Delete account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
