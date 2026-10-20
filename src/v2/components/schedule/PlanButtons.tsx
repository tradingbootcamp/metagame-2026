"use client";

import { useState, useTransition } from "react";
import { StarIcon } from "lucide-react";
import {
  bookmark,
  rsvpTo,
  unRsvp,
  type PlanResult,
} from "@/app/(v2)/schedule/actions";
import { Button } from "@/v2/components/ui/button";
import type { RsvpStatus } from "@/lib/schedule";

/** The signed-in attendee's RSVP and bookmark controls for one session. */
export default function PlanButtons({
  sessionId,
  status,
  bookmarked,
  full,
}: {
  sessionId: string;
  status: RsvpStatus | null;
  bookmarked: boolean;
  /** Going count has reached capacity, so a new RSVP joins the waitlist. */
  full: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<PlanResult>) =>
    start(async () => setError((await action()).error ?? null));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === null ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => rsvpTo(sessionId))}
        >
          {full ? "Join waitlist" : "RSVP"}
        </Button>
      ) : (
        <>
          <span className="text-sm font-medium text-navy">
            {status === "going" ? "You’re going" : "You’re on the waitlist"}
          </span>
          <Button
            size="sm"
            variant="navy"
            disabled={pending}
            onClick={() => run(() => unRsvp(sessionId))}
          >
            {status === "going" ? "Cancel RSVP" : "Leave waitlist"}
          </Button>
        </>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => bookmark(sessionId, !bookmarked))}
        aria-pressed={bookmarked}
        title={bookmarked ? "Remove bookmark" : "Bookmark"}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-ink/70 hover:text-navy disabled:opacity-60"
      >
        <StarIcon
          className={`size-4 ${bookmarked ? "fill-amber-400 text-amber-500" : ""}`}
        />
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </button>
      {error && <span className="text-xs text-meeple">{error}</span>}
    </div>
  );
}
