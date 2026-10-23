"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import { useCopy } from "@/v2/lib/use-copy";

/** Shows a freshly minted API key once, for /account and /admin/api-keys alike. */
export function MintedKeyDialog({
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
