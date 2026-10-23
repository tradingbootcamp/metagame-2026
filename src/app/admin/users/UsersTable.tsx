"use client";

import { TicketIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { removeUser, setBanned, setRole, type Result } from "./actions";
import { fieldClass, smallButtonClass } from "../ui";
import { ticketBadge } from "@/lib/admin-tickets";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  admin: boolean;
  roles: string[];
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

export default function UsersTable({
  rows,
  total,
  query,
  truncated,
  viewerIsAdmin,
  viewerCanDelete,
}: {
  rows: UserRow[];
  total: number;
  query: string;
  truncated: boolean;
  /** Only `user.role = 'admin'` accounts may change the admin role and bans. */
  viewerIsAdmin: boolean;
  /** `users.delete`; deleting an admin account still needs an admin. */
  viewerCanDelete: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<UserRow | null>(null);

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
              <th className="px-4 py-2 font-medium">Ticket</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Access</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id} className={u.banned ? "text-ink/50" : ""}>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-navy underline-offset-2 hover:text-meeple hover:underline"
                  >
                    {u.name.trim() || "Unnamed"}
                  </Link>
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
                  {u.banned ? (
                    <span className="rounded bg-meeple/10 px-1.5 py-0.5 text-xs font-semibold text-meeple">
                      Banned
                    </span>
                  ) : u.admin ? (
                    <span className="rounded bg-navy/10 px-1.5 py-0.5 text-xs font-semibold text-navy">
                      Admin
                    </span>
                  ) : u.roles.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className="rounded bg-sky px-1.5 py-0.5 text-xs font-semibold text-navy"
                        >
                          {r}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-ink/50">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {!u.self && (viewerIsAdmin || viewerCanDelete) && (
                    <span className="inline-flex gap-2">
                      {viewerIsAdmin && (
                        <>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(() =>
                                setRole(u.id, u.admin ? "user" : "admin"),
                              )
                            }
                            className={smallButtonClass}
                          >
                            {u.admin ? "Remove admin" : "Make admin"}
                          </button>
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
                        </>
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
            ))}
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
