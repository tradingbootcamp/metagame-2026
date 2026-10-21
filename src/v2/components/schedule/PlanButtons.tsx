"use client";

import { useRef, useState } from "react";
import { StarIcon } from "lucide-react";
import {
  bookmark,
  rsvpTo,
  unRsvp,
  type PlanResult,
} from "@/app/(v2)/schedule/actions";
import { Button } from "@/v2/components/ui/button";
import type { RsvpStatus } from "@/lib/schedule";

type Plan = { status: RsvpStatus | null; bookmarked: boolean };
type Field = keyof Plan;

/**
 * The signed-in attendee's RSVP and bookmark controls for one session.
 * Clicks show at once; the server's answer then settles them.
 */
export default function PlanButtons({
  sessionId,
  status,
  bookmarked,
  full,
  onSettled,
}: {
  sessionId: string;
  status: RsvpStatus | null;
  bookmarked: boolean;
  /** Going count has reached capacity, so a new RSVP joins the waitlist. */
  full: boolean;
  onSettled?: (result: PlanResult) => void;
}) {
  const fromProps: Plan = { status, bookmarked };
  // `confirmed` is the server's last answer, for rolling back a failed click.
  const [state, setState] = useState({
    shown: fromProps,
    confirmed: fromProps,
    props: fromProps,
  });
  const plan = state.shown;
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Record<Field, number>>({ status: 0, bookmarked: 0 });
  const rsvpSaving = useRef(false);

  // A server render with new values (e.g. after navigating back) wins.
  if (state.props.status !== status || state.props.bookmarked !== bookmarked) {
    setState({ shown: fromProps, confirmed: fromProps, props: fromProps });
  }

  // Server actions run one at a time in click order, so the last click's
  // answer is the final state; earlier answers only update `confirmed`.
  async function run<F extends Field>(
    field: F,
    next: Plan[F],
    action: () => Promise<PlanResult>,
  ) {
    const seq = ++latest.current[field];
    setError(null);
    setState((s) => ({ ...s, shown: { ...s.shown, [field]: next } }));
    let result: PlanResult;
    try {
      result = await action();
    } catch {
      result = { error: "Couldn’t save. Try again." };
    }
    const isLatest = seq === latest.current[field];
    if (result.error) {
      if (isLatest) {
        setState((s) => ({
          ...s,
          shown: { ...s.shown, [field]: s.confirmed[field] },
        }));
        setError(result.error);
      }
      return;
    }
    const value = field === "status" ? result.status : result.bookmarked;
    if (value !== undefined) {
      setState((s) => ({
        ...s,
        confirmed: { ...s.confirmed, [field]: value },
        shown: isLatest ? { ...s.shown, [field]: value } : s.shown,
      }));
    }
    if (isLatest) onSettled?.(result);
  }

  // RSVP and Cancel swap places, so a double-click would undo itself.
  async function runRsvp(next: RsvpStatus | null) {
    if (rsvpSaving.current) return;
    rsvpSaving.current = true;
    try {
      await run("status", next, () =>
        next ? rsvpTo(sessionId) : unRsvp(sessionId),
      );
    } finally {
      rsvpSaving.current = false;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {plan.status === null ? (
        <Button size="sm" onClick={() => runRsvp(full ? "waitlist" : "going")}>
          {full ? "Join waitlist" : "RSVP"}
        </Button>
      ) : (
        <>
          <span className="text-sm font-medium text-navy">
            {plan.status === "going"
              ? "You’re going"
              : "You’re on the waitlist"}
          </span>
          <Button size="sm" variant="navy" onClick={() => runRsvp(null)}>
            {plan.status === "going" ? "Cancel RSVP" : "Leave waitlist"}
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={() =>
          run("bookmarked", !plan.bookmarked, () =>
            bookmark(sessionId, !plan.bookmarked),
          )
        }
        aria-pressed={plan.bookmarked}
        title={plan.bookmarked ? "Remove bookmark" : "Bookmark"}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-ink/70 hover:text-navy"
      >
        <StarIcon
          className={`size-4 ${plan.bookmarked ? "fill-amber-400 text-amber-500" : ""}`}
        />
        {plan.bookmarked ? "Bookmarked" : "Bookmark"}
      </button>
      {error && <span className="text-xs text-meeple">{error}</span>}
    </div>
  );
}
