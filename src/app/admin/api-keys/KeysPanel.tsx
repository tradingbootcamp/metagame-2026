"use client";

import { useState, useTransition } from "react";
import { createKey, lookupAccount, revokeKey } from "./actions";
import { buttonClass, fieldClass, smallButtonClass } from "../ui";
import { MintedKeyDialog } from "@/components/MintedKeyDialog";

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
  /** The account the typed email resolves to, once looked up. */
  const [found, setFound] = useState<{ email: string; name: string } | null>(
    null,
  );

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
              setFound(null);
            }
          });
        }}
      >
        <h2 className="font-bebas text-xl tracking-wide text-navy">New key</h2>
        <p className="text-sm text-ink/60">
          Make an API key for an account. If there is no account with the
          provided email, a provisional one will be created.
        </p>
        <label className="block text-sm">
          Account email
          <input
            name="email"
            type="email"
            required
            placeholder="claude@…"
            className={fieldClass}
            onBlur={(e) => {
              const email = e.currentTarget.value.trim().toLowerCase();
              if (!email) return setFound(null);
              if (found?.email === email) return;
              startTransition(async () => {
                const r = await lookupAccount(email);
                setFound(r.exists ? { email, name: r.name ?? "" } : null);
              });
            }}
          />
        </label>
        <label className="block text-sm">
          Account name
          <input
            key={found?.email ?? "new"}
            name="name"
            placeholder="Claude"
            defaultValue={found?.name ?? ""}
            disabled={found !== null}
            className={`${fieldClass} disabled:bg-ink/5 disabled:text-ink/60`}
          />
          {found && (
            <span className="mt-1 block text-xs text-ink/50">
              Existing account.
            </span>
          )}
        </label>
        <label className="block text-sm">
          Key name
          <input
            name="label"
            required
            placeholder="metagame-claude-code"
            className={fieldClass}
          />
        </label>
        <button type="submit" disabled={pending} className={buttonClass}>
          Create
        </button>
        {error && <p className="text-sm text-meeple">{error}</p>}
      </form>

      <MintedKeyDialog value={minted} onClose={() => setMinted(null)} />

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
