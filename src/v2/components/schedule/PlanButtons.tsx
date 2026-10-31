"use client";

import { useRef, useState } from "react";
import { StarIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import {
  bookmark,
  rsvpTo,
  unRsvp,
  type PlanResult,
} from "@/app/(v2)/schedule/actions";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import {
  rsvpPrompt,
  type PlanConflict,
  type RsvpConfirm,
  type RsvpStatus,
} from "@/lib/schedule";

type Plan = { status: RsvpStatus | null; bookmarked: boolean };
type Field = keyof Plan;

const TONE: Record<
  RsvpConfirm["tone"],
  { content: string; title: string; list: string }
> = {
  confirm: { content: "border-line", title: "text-navy", list: "" },
  warning: {
    content: "border-2 border-tan",
    title: "text-navy",
    list: "border-tan bg-peach/40",
  },
  urgent: {
    content: "border-2 border-meeple",
    title: "text-meeple",
    list: "border-meeple bg-meeple/10",
  },
};

/**
 * The signed-in attendee's RSVP and bookmark controls for one session.
 * Clicks show at once; the server's answer then settles them.
 */
export default function PlanButtons({
  sessionId,
  status,
  bookmarked,
  full,
  commitment = false,
  conflicts = [],
  onSettled,
}: {
  sessionId: string;
  status: RsvpStatus | null;
  bookmarked: boolean;
  /** Going count has reached capacity, so a new RSVP joins the waitlist. */
  full: boolean;
  /** RSVPing claims a spot people rely on, so it's confirmed first. */
  commitment?: boolean;
  /** The viewer's other sessions at the same time, warned about first. */
  conflicts?: PlanConflict[];
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
  const latest = useRef<Record<Field, number>>({ status: 0, bookmarked: 0 });
  const rsvpSaving = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const prompt = rsvpPrompt(commitment, full, conflicts);
  const tone = prompt.confirm && TONE[prompt.confirm.tone];
  const join = () => runRsvp(full ? "waitlist" : "going");

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
    done: string,
  ) {
    const seq = ++latest.current[field];
    const toastId = `plan-${sessionId}-${field}`;
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
        toast.error(result.error, { id: toastId });
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
    if (isLatest) {
      toast.success(
        field === "status" && result.status === "waitlist"
          ? "It’s full, so you’re on the waitlist."
          : done,
        { id: toastId },
      );
      onSettled?.(result);
    }
  }

  // RSVP and Cancel swap places, so a double-click would undo itself.
  async function runRsvp(next: RsvpStatus | null) {
    if (rsvpSaving.current) return;
    rsvpSaving.current = true;
    try {
      await run(
        "status",
        next,
        () => (next ? rsvpTo(sessionId) : unRsvp(sessionId)),
        next
          ? "You’re going."
          : plan.status === "waitlist"
            ? "You’ve left the waitlist."
            : "RSVP cancelled.",
      );
    } finally {
      rsvpSaving.current = false;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {plan.status === null ? (
        <Button
          size="sm"
          onClick={() => (prompt.confirm ? setConfirming(true) : join())}
        >
          {prompt.label}
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
          run(
            "bookmarked",
            !plan.bookmarked,
            () => bookmark(sessionId, !plan.bookmarked),
            plan.bookmarked ? "Bookmark removed." : "Bookmarked.",
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
      {prompt.confirm && tone && (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent
            role="alertdialog"
            showCloseButton={false}
            // Above RouteModal (z-[100]), which hosts this on the session page.
            overlayClassName="z-[110]"
            className={`z-[110] max-w-[440px] bg-white px-6 py-5 text-ink ${tone.content}`}
          >
            <DialogTitle
              className={`mb-2 flex items-center gap-2 font-grotesk text-xl font-bold ${tone.title}`}
            >
              {prompt.confirm.conflicts.length > 0 && (
                <TriangleAlertIcon aria-hidden className="size-5 shrink-0" />
              )}
              {prompt.confirm.title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-col gap-3 text-sm text-ink/80">
                {prompt.confirm.conflicts.length > 0 && (
                  <ul
                    className={`flex flex-col gap-1 rounded-md border-l-4 px-3 py-2 font-semibold text-ink ${tone.list}`}
                  >
                    {prompt.confirm.conflicts.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
                {prompt.confirm.body && <p>{prompt.confirm.body}</p>}
              </div>
            </DialogDescription>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md px-3 py-2 text-sm font-semibold text-ink/70 hover:text-navy"
              >
                Cancel
              </button>
              <Button
                size="sm"
                onClick={() => {
                  setConfirming(false);
                  join();
                }}
              >
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
