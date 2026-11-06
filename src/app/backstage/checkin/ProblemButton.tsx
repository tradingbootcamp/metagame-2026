"use client";

import { useActionState, useState } from "react";
import { buttonClass, fieldClass, smallButtonClass } from "../ui";
import { reportProblem } from "./actions";

/** Posts a note to the website-errors Discord channel with the desk context. */
export default function ProblemButton({
  q,
  paymentId,
}: {
  q: string;
  paymentId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useActionState(reportProblem, {});

  if (state.done) {
    return <span className="text-sm text-moss">{state.done}</span>;
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${smallButtonClass} py-2`}
      >
        Report issue
      </button>
    );
  }
  return (
    <form action={run} className="flex w-full flex-col gap-2">
      <input type="hidden" name="q" value={q} />
      {paymentId && <input type="hidden" name="paymentId" value={paymentId} />}
      <textarea
        name="text"
        required
        autoFocus
        rows={3}
        maxLength={1200}
        placeholder="What happened? Who's in front of you?"
        aria-label="What's wrong"
        className={fieldClass}
      />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={smallButtonClass}
        >
          Cancel
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-meeple">
          {state.error}
        </p>
      )}
    </form>
  );
}
