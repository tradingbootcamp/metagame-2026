"use client";

import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { createOwnKey, revokeOwnKey } from "./api-keys-actions";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
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

function MintedKeyDialog({
  value,
  onClose,
}: {
  value: string | null;
  onClose: () => void;
}) {
  const { status, copy } = useCopy();
  const Icon = status === "copied" ? CheckIcon : CopyIcon;
  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-w-[520px] flex-col gap-5 px-8 py-7">
        <DialogTitle className="font-bebas text-2xl tracking-wide text-cream">
          Your new API key
        </DialogTitle>
        <DialogDescription className="text-base text-cream/80">
          Save this. You won’t be able to view it again.
        </DialogDescription>
        <code className="block rounded-lg bg-cream p-3 font-mono text-xs break-all text-ink">
          {value}
        </code>
        <div className="flex justify-end gap-3">
          <Button type="button" size="sm" onClick={() => value && copy(value)}>
            <Icon className="size-4" />
            {status === "copied"
              ? "Copied"
              : status === "failed"
                ? "Couldn’t copy"
                : "Copy"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ApiKeysPanel({ rows }: { rows: KeyRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  return (
    <section className="flex max-w-[640px] flex-col gap-4">
      <h2 className="font-grotesk text-2xl font-bold text-navy">API keys</h2>
      <p className="text-sm text-ink/70">
        A key acts as your account: anything you can do here, a request carrying
        the key can do too.
      </p>
      <form
        className="flex items-center gap-3"
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
        <Input
          name="label"
          aria-label="Key name"
          required
          maxLength={80}
          placeholder="metagame-claude-code"
          className={`${FIELD_LIGHT} flex-1`}
        />
        <Button type="submit" disabled={pending}>
          {pending && !revokingId ? "Creating…" : "Create"}
        </Button>
      </form>
      {error && (
        <p aria-live="polite" className="text-sm text-meeple">
          {error}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-ink/60">You don’t have any keys yet.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {rows.map((k) => (
            <li
              key={k.id}
              className={`flex items-center gap-3 py-2 ${k.enabled ? "" : "text-ink/50"}`}
            >
              <span className="font-semibold text-ink">{k.label || "—"}</span>
              <span className="font-mono text-xs text-ink/50">{k.start}…</span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink/60">
                {k.created}
                {k.lastUsed ? ` · used ${k.lastUsed}` : ""}
              </span>
              <button
                type="button"
                disabled={pending}
                className="text-xs text-ink/60 hover:text-meeple hover:underline disabled:opacity-60"
                onClick={() => {
                  setRevokingId(k.id);
                  startTransition(async () => {
                    setError((await revokeOwnKey(k.id)).error ?? null);
                    setRevokingId(null);
                  });
                }}
              >
                {revokingId === k.id ? "Revoking…" : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <MintedKeyDialog value={minted} onClose={() => setMinted(null)} />
    </section>
  );
}
