"use client";

import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { createOwnKey, revokeOwnKey } from "./api-keys-actions";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import { FIELD_LIGHT } from "@/v2/components/styles";
import { useCopy } from "@/v2/lib/use-copy";

export type KeyRow = {
  id: string;
  label: string;
  start: string;
  enabled: boolean;
  created: string;
  lastUsed: string | null;
};

const OUTLINE = "border-navy/40 text-navy";

function MintedKey({ value, onDone }: { value: string; onDone: () => void }) {
  const { status, copy } = useCopy();
  const Icon = status === "copied" ? CheckIcon : CopyIcon;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-navy bg-navy/5 p-5">
      <p className="text-sm font-semibold text-navy">
        Copy this now; it isn’t shown again.
      </p>
      <code className="block rounded-lg bg-white p-3 font-mono text-xs break-all text-ink">
        {value}
      </code>
      <div className="flex gap-3">
        <Button
          type="button"
          size="sm"
          variant="navy"
          onClick={() => copy(value)}
        >
          <Icon className="size-4" />
          {status === "copied"
            ? "Copied"
            : status === "failed"
              ? "Couldn’t copy"
              : "Copy key"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={OUTLINE}
          onClick={onDone}
        >
          Done
        </Button>
      </div>
    </div>
  );
}

export default function ApiKeysPanel({ rows }: { rows: KeyRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-grotesk text-2xl font-bold text-navy">API keys</h2>
      <p className="text-sm text-ink/70">
        A key acts as your account: anything you can do here, a request carrying
        the key can do too.
      </p>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const label = String(new FormData(form).get("label") ?? "");
          startTransition(async () => {
            const result = await createOwnKey(label);
            setError(result.error ?? null);
            if (result.key) {
              setMinted(result.key);
              form.reset();
            }
          });
        }}
      >
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy">Label</span>
          <Input
            name="label"
            required
            maxLength={80}
            placeholder="Claude Code on my laptop"
            className={FIELD_LIGHT}
          />
        </label>
        <Button type="submit" disabled={pending} className="self-start">
          {pending && !revokingId ? "Creating…" : "Create key"}
        </Button>
      </form>
      <p aria-live="polite" className="min-h-5 text-sm text-meeple">
        {error}
      </p>
      {minted && <MintedKey value={minted} onDone={() => setMinted(null)} />}
      {rows.length === 0 ? (
        <p className="text-base text-ink/70">You don’t have any keys yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {rows.map((k) => (
            <li
              key={k.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${k.enabled ? "" : "text-ink/50"}`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-base font-semibold text-ink">
                  {k.label || "—"}{" "}
                  <span className="font-mono text-xs font-normal text-ink/60">
                    {k.start}…
                  </span>
                </span>
                <span className="text-sm text-ink/70">
                  Created {k.created} ·{" "}
                  {k.lastUsed ? `last used ${k.lastUsed}` : "never used"}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                className={`${OUTLINE} hover:border-meeple hover:text-meeple`}
                onClick={() => {
                  setRevokingId(k.id);
                  startTransition(async () => {
                    setError((await revokeOwnKey(k.id)).error ?? null);
                    setRevokingId(null);
                  });
                }}
              >
                {revokingId === k.id ? "Revoking…" : "Revoke"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
