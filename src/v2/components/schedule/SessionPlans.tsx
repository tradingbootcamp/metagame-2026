"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  PlanConflict,
  RsvpStatus,
  PublicPerson,
  RsvpTicket,
  SessionRsvps,
} from "@/lib/schedule";
import { sessionPageSlug } from "@/lib/session-link";
import ProfileLink from "../ProfileLink";
import PlanButtons from "./PlanButtons";
import { announcePlanChange, countsAsMine } from "./plan-sync";

/** A session page's RSVP controls and attendee list, updated together in place. */
export default function SessionPlans({
  sessionId,
  capacity,
  commitment,
  open,
  inviteOnly = false,
  invited = true,
  closed = false,
  conflicts,
  rsvps: initial,
  ticket,
  plan,
  ownSession,
  signIn,
}: {
  sessionId: string;
  capacity: number | null;
  commitment: boolean;
  open: boolean;
  inviteOnly?: boolean;
  /** On the guest list, or the session isn't invite-only. */
  invited?: boolean;
  /** Attendee actions are off for this viewer: their plan is read-only. */
  closed?: boolean;
  conflicts: PlanConflict[];
  rsvps: SessionRsvps;
  ticket?: RsvpTicket;
  /** The viewer's own plan, or null when signed out. */
  plan: { status: RsvpStatus | null; bookmarked: boolean } | null;
  /** The viewer hosts or shepherds it, so it stays theirs whatever they click. */
  ownSession: boolean;
  signIn: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [rsvps, setRsvps] = useState(initial);
  const [prev, setPrev] = useState(initial);
  if (prev !== initial) {
    setPrev(initial);
    setRsvps(initial);
  }
  // A ref: an in-flight click's handler was made on an earlier render.
  const saved = useRef(plan);
  useEffect(() => {
    saved.current = plan;
  }, [plan]);

  return (
    <>
      {!closed && inviteOnly && (
        <p className="text-sm text-[#1b1530]/70">
          {!plan
            ? "This one is invite-only. If you were invited, sign in with the email your invite went to."
            : invited
              ? "This one is invite-only, and you’re on the guest list."
              : "This one is invite-only, and your account’s email isn’t on the guest list. If you were invited, sign in with the email your invite went to, or ask whoever invited you to add this email."}
        </p>
      )}
      {!closed && commitment && (
        <p className="text-sm text-[#1b1530]/70">
          Spots are limited and the host is counting on you, so only RSVP if
          you&rsquo;ll be there.
        </p>
      )}
      {closed ? (
        <ClosedPlan plan={plan} />
      ) : plan ? (
        <PlanButtons
          sessionId={sessionId}
          status={plan.status}
          bookmarked={plan.bookmarked}
          full={capacity !== null && rsvps.going >= capacity}
          commitment={commitment}
          open={open}
          invited={invited}
          conflicts={conflicts}
          ticket={ticket}
          onSettled={(result) => {
            if (result.rsvps) setRsvps(result.rsvps);
            const now = {
              ...plan,
              ...saved.current,
              ...(result.status !== undefined && { status: result.status }),
              ...(result.bookmarked !== undefined && {
                bookmarked: result.bookmarked,
              }),
            };
            saved.current = now;
            // A schedule underneath keeps the viewer's plans itself; other
            // pages (the account lists, a session's own page, whose plan is
            // this modal's prop) render them on the server.
            const mine = countsAsMine(now, ownSession);
            const held = announcePlanChange({ sessionId, mine });
            if (!held || sessionPageSlug(pathname)) router.refresh();
          }}
        />
      ) : (
        signIn
      )}
      <Attendees rsvps={rsvps} />
    </>
  );
}

/** What the viewer had planned, with nothing left to click. */
function ClosedPlan({
  plan,
}: {
  plan: { status: RsvpStatus | null; bookmarked: boolean } | null;
}) {
  return (
    <>
      {plan?.status && (
        <p className="text-sm font-semibold text-navy">
          {plan.status === "going"
            ? "You RSVP’d to this one."
            : "You were on the waitlist for this one."}
        </p>
      )}
      {plan?.bookmarked && (
        <p className="text-sm font-semibold text-navy">
          You bookmarked this one.
        </p>
      )}
      <p className="text-sm text-[#1b1530]/60">
        Metagame 2026 is over, so RSVPs and bookmarks are closed.
      </p>
    </>
  );
}

function Attendees({ rsvps }: { rsvps: SessionRsvps }) {
  const counts = [
    `${rsvps.going} going`,
    rsvps.waitlist > 0 ? `${rsvps.waitlist} waitlisted` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  if (!rsvps.names) return <p className="text-[15px]">{counts}</p>;
  const list = (title: string, names: PublicPerson[]) =>
    names.length > 0 && (
      <div>
        <p className="mb-1 text-xs tracking-[0.12em] text-[#1b1530]/55 uppercase">
          {title}
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[15px]">
          {names.map(({ userId, name }) => (
            <li key={userId}>
              <ProfileLink userId={userId} name={name} />
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px]">{counts}</p>
      {list("Going", rsvps.names.going)}
      {list("Waitlist", rsvps.names.waitlist)}
    </div>
  );
}
