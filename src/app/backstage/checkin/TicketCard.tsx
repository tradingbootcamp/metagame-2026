"use client";

import { useActionState, useId, useState } from "react";
import { buttonClass, fieldClass, smallButtonClass } from "../ui";
import { badgeAction, undoAction } from "./actions";
import ClaimPicker from "./ClaimPicker";
import type { DeskTicket } from "./desk";
import ProblemButton from "./ProblemButton";
import { formatBadgeCode } from "@/lib/badge-code";
import { parseBadgeInput, type CheckinState } from "@/lib/checkin";

const PILL: Record<CheckinState, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-meeple/10 text-meeple" },
  unclaimed: { label: "Unclaimed", className: "bg-tan/30 text-ink" },
  claimed: { label: "Claimed", className: "bg-navy/10 text-navy" },
  checkedIn: { label: "Checked in", className: "bg-moss/15 text-moss" },
};

export default function TicketCard({
  ticket,
  q,
}: {
  ticket: DeskTicket;
  q: string;
}) {
  const pill = PILL[ticket.state];
  const badge = ticket.badge === null ? null : formatBadgeCode(ticket.badge);
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-navy">
            {ticket.name}
          </h2>
          {ticket.purchaserEmail && (
            <p className="truncate font-mono text-sm text-ink/60">
              {ticket.purchaserEmail}
            </p>
          )}
          <p className="text-sm text-ink/70">
            {ticket.tier} ·{" "}
            {badge ? (
              <>
                badge <span className="font-mono">{badge}</span>
              </>
            ) : (
              "no badge"
            )}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${pill.className}`}
        >
          {pill.label}
        </span>
      </div>

      {ticket.state === "unpaid" && (
        <p className="text-sm text-ink/70">
          Not paid. Send them to the ticket page, or check the purchase under{" "}
          {ticket.purchaserEmail ?? "their email"}.
        </p>
      )}
      {ticket.state === "unclaimed" && (
        <ClaimPicker
          paymentId={ticket.paymentId}
          suggested={ticket.suggested}
        />
      )}
      {ticket.state === "claimed" && <BadgeForm ticket={ticket} checkIn />}
      {ticket.state === "checkedIn" && ticket.checkedIn && (
        <>
          <p className="text-sm text-ink/70">
            Checked in at {ticket.checkedIn.at} by {ticket.checkedIn.by}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <BadgeForm ticket={ticket} />
            <UndoForm paymentId={ticket.paymentId} />
          </div>
        </>
      )}
      <div className="flex justify-end">
        <ProblemButton q={q} paymentId={ticket.paymentId} compact />
      </div>
    </article>
  );
}

/** The badge field, with "Check in" when the ticket still needs it. */
function BadgeForm({
  ticket,
  checkIn = false,
}: {
  ticket: DeskTicket;
  checkIn?: boolean;
}) {
  const [state, run, pending] = useActionState(badgeAction, {});
  const stored = ticket.badge === null ? "" : formatBadgeCode(ticket.badge);
  const [value, setValue] = useState(stored);
  const [seen, setSeen] = useState(stored);
  // A save or a sibling's edit changes the stored badge under the field.
  if (stored !== seen) {
    setSeen(stored);
    setValue(stored);
  }
  const id = useId();
  const changed = parseBadgeInput(value) !== ticket.badge;
  return (
    <form action={run} className="flex flex-1 flex-col gap-2">
      <input type="hidden" name="paymentId" value={ticket.paymentId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-sm font-medium text-ink/80">
            Badge number
          </label>
          <input
            id={id}
            name="badge"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            placeholder="0000"
            className={`${fieldClass} w-28 py-3 text-center font-mono text-xl tracking-widest`}
          />
        </div>
        {checkIn && (
          <button
            type="submit"
            name="intent"
            value="checkin"
            disabled={pending}
            className={`${buttonClass} w-auto py-3`}
          >
            {pending ? "Working…" : "Check in"}
          </button>
        )}
        {changed && (
          <button
            type="submit"
            name="intent"
            value="badge"
            disabled={pending}
            className={`${smallButtonClass} py-3`}
          >
            {value.trim() === "" ? "Remove badge" : "Save badge"}
          </button>
        )}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-meeple">
          {state.error}
        </p>
      )}
      {state.done && !state.error && (
        <p className="text-sm text-moss">{state.done}</p>
      )}
    </form>
  );
}

/** Undo behind a second tap. */
function UndoForm({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useActionState(undoAction, {});
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${smallButtonClass} py-3`}
      >
        Undo check-in
      </button>
    );
  }
  return (
    <form action={run} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <button
        type="submit"
        disabled={pending}
        className={`${smallButtonClass} border-meeple py-3 text-meeple`}
      >
        {pending ? "Undoing…" : "Yes, undo"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className={`${smallButtonClass} py-3`}
      >
        Cancel
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-meeple">
          {state.error}
        </p>
      )}
    </form>
  );
}
