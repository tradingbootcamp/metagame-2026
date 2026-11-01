"use client";

import type { ReactNode } from "react";
import { smallButtonClass } from "../ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

const PRIMARY =
  "rounded-md bg-meeple px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-meeple-dark disabled:opacity-60";

export type ConfirmAction = {
  label: string;
  onClick: () => void;
  /** The emphasised choice; the others render quieter. */
  primary?: boolean;
  disabled?: boolean;
};

/**
 * A small modal question over the page (or over another dialog, where Esc
 * closes only this one). Esc and the backdrop call `onDismiss`, which should
 * match the safe choice; the first action takes focus on open.
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  actions,
  onDismiss,
  onClosed,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  actions: ConfirmAction[];
  onDismiss: () => void;
  /** Runs once it has closed, in place of returning focus to where it was. */
  onClosed?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        onCloseAutoFocus={
          onClosed
            ? (e) => {
                e.preventDefault();
                onClosed();
              }
            : undefined
        }
        className="max-w-[440px] border-line bg-white px-6 py-5 text-ink"
      >
        <DialogTitle className="font-bebas mb-2 text-2xl tracking-wide text-navy">
          {title}
        </DialogTitle>
        <DialogDescription className="text-sm text-ink/80">
          {children}
        </DialogDescription>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              onClick={a.onClick}
              className={a.primary ? PRIMARY : smallButtonClass}
            >
              {a.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
