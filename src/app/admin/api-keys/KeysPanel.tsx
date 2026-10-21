"use client";

import { useState, useTransition } from "react";
import { createKey, revokeKey } from "./actions";
import { buttonClass, fieldClass, smallButtonClass, useCopy } from "../ui";

export type KeyRow = {
  id: string;
  label: string;
  start: string;
  enabled: boolean;
  owner: string;
  email: string;
  created: string;
  lastUsed: string | null;
};

export default function KeysPanel({ rows }: { rows: KeyRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { status, copy } = useCopy();

  return (
    <div className="space-y-6">
      <form
        className="max-w-xl space-y-3 rounded-xl border border-line bg-white p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          startTransition(async () => {
            const result = await createKey(
              String(fd.get("email") ?? ""),
              String(fd.get("name") ?? ""),
              String(fd.get("label") ?? ""),
            );
            setError(result.error ?? null);
            if (result.key) {
              setMinted(result.key);
              form.reset();
            }
          });
        }}
      >
        <h2 className="font-bebas text-xl tracking-wide text-navy">New key</h2>
        <p className="text-sm text-ink/60">
          Requests carrying the key act as this account, which is made if it
          doesn’t exist. The schedule API admits accounts that can manage the
          schedule; give it a role or a grant on Users.
        </p>
        <label className="block text-sm">
          Account email
          <input
            name="email"
            type="email"
            required
            placeholder="claude@…"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          Account name (for a new account)
          <input name="name" placeholder="Claude" className={fieldClass} />
        </label>
        <label className="block text-sm">
          Key label
          <input
            name="label"
            required
            placeholder="Claude Code on Brian’s Mac"
            className={fieldClass}
          />
        </label>
        <button type="submit" disabled={pending} className={buttonClass}>
          Create key
        </button>
        {error && <p className="text-sm text-meeple">{error}</p>}
      </form>

      {minted && (
        <div className="max-w-xl space-y-2 rounded-xl border border-navy bg-navy/5 p-5">
          <p className="text-sm font-semibold text-navy">
            Copy this now; it isn’t shown again.
          </p>
          <code className="block rounded-lg bg-white p-3 font-mono text-xs break-all">
            {minted}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy(minted)}
              className={smallButtonClass}
            >
              {status === "copied"
                ? "Copied"
                : status === "failed"
                  ? "Copy failed"
                  : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setMinted(null)}
              className={smallButtonClass}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Label</th>
              <th className="px-4 py-2 font-medium">Key</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Last used</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((k) => (
              <tr key={k.id} className={k.enabled ? "" : "text-ink/50"}>
                <td className="px-4 py-2">{k.label || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{k.start}…</td>
                <td className="px-4 py-2">
                  {k.owner}{" "}
                  <span className="font-mono text-xs text-ink/50">
                    {k.email}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{k.created}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {k.lastUsed ?? "never"}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        setError((await revokeKey(k.id)).error ?? null);
                      })
                    }
                    className={`${smallButtonClass} hover:border-meeple hover:text-meeple`}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                  No keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
