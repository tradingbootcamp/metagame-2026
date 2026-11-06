"use client";

import { useActionState, useState } from "react";
import { buttonClass, smallButtonClass } from "../ui";
import { undoAction } from "./actions";
import ArriveModal from "./ArriveModal";
import type { DeskTicket } from "./desk";
import { formatBadgeCode } from "@/lib/badge-code";
import type { CheckinState } from "@/lib/checkin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

const PILL: Record<CheckinState, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-meeple/10 text-meeple" },
  unclaimed: { label: "Unclaimed", className: "bg-tan/30 text-ink" },
  claimed: { label: "Claimed", className: "bg-navy/10 text-navy" },
  checkedIn: { label: "Checked in", className: "bg-moss/15 text-moss" },
};

const ACTION: Partial<Record<CheckinState, string>> = {
  unclaimed: "Claim",
  claimed: "Check in",
  checkedIn: "Undo",
};

export default function TicketRow({ ticket }: { ticket: DeskTicket }) {
  const [open, setOpen] = useState(false);
  const pill = PILL[ticket.state];
  const action = ACTION[ticket.state];
  const badge = ticket.badge === null ? null : formatBadgeCode(ticket.badge);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-navy">
          {ticket.name}
        </span>
        <span className="block truncate font-mono text-xs text-ink/60">
          {ticket.purchaserEmail ?? ticket.tier}
        </span>
      </span>
      <span className="w-12 shrink-0 text-right font-mono text-sm text-ink/70">
        {badge ?? "—"}
      </span>
      <span
        className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline ${pill.className}`}
      >
        {pill.label}
      </span>
      <span className="w-24 shrink-0 text-right">
        {action && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={
              ticket.state === "checkedIn"
                ? `${smallButtonClass} py-2`
                : `${buttonClass} w-auto px-3 py-2 text-sm`
            }
          >
            {action}
          </button>
        )}
      </span>
      {open && ticket.state === "checkedIn" && (
        <UndoModal ticket={ticket} onClose={() => setOpen(false)} />
      )}
      {open && ticket.state !== "checkedIn" && (
        <ArriveModal ticket={ticket} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function UndoModal({
  ticket,
  onClose,
}: {
  ticket: DeskTicket;
  onClose: () => void;
}) {
  const [state, run, pending] = useActionState(undoAction, {});
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[400px] border-line bg-white p-5 text-ink"
        showCloseButton={false}
      >
        <form action={run} className="flex flex-col gap-4">
          <input type="hidden" name="paymentId" value={ticket.paymentId} />
          <DialogTitle className="text-lg font-semibold text-navy">
            Undo check-in for {ticket.name}?
          </DialogTitle>
          <DialogDescription className="text-sm text-ink/70">
            {ticket.checkedIn
              ? `Checked in at ${ticket.checkedIn.at} by ${ticket.checkedIn.by}. `
              : ""}
            Their badge number stays on the ticket.
          </DialogDescription>
          {state.error && (
            <p role="alert" className="text-sm text-meeple">
              {state.error}
            </p>
          )}
          {state.done && <p className="text-sm text-moss">{state.done}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`${smallButtonClass} py-2.5`}
            >
              {state.done ? "Close" : "Cancel"}
            </button>
            {!state.done && (
              <button
                type="submit"
                disabled={pending}
                className={`${smallButtonClass} border-meeple py-2.5 text-meeple`}
              >
                {pending ? "Undoing…" : "Yes, undo"}
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
