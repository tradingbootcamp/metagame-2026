import Link from "next/link";
import type { ReactNode } from "react";
import type {
  AccountSessionRow,
  AccountSessions,
} from "@/lib/account-sessions";
import { openSessionHref } from "@/lib/session-link";
import { SessionLink } from "@/v2/components/schedule/SessionModalHost";
import PlanButtons from "@/v2/components/schedule/PlanButtons";

const TAG = "rounded px-1.5 py-0.5 text-xs font-semibold";

function Row({
  s,
  linkable,
  children,
}: {
  s: AccountSessionRow;
  linkable: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-base font-semibold text-ink">
          {linkable && s.listed ? (
            <SessionLink
              href={openSessionHref("/account", s.slug, "tab=sessions")}
              className="underline-offset-2 hover:underline"
            >
              {s.title}
            </SessionLink>
          ) : (
            s.title
          )}
        </span>
        {s.status === "draft" && (
          <span className={`${TAG} bg-tan/30 text-ink`}>Draft</span>
        )}
      </div>
      <p className="text-sm text-ink/70">
        {s.when ?? "Time TBA"}
        {s.room && <> · {s.room}</>}
      </p>
      {children}
    </li>
  );
}

function List({
  title,
  empty,
  rows,
  render,
}: {
  title: string;
  empty: string;
  rows: AccountSessionRow[];
  render: (s: AccountSessionRow) => ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-grotesk text-2xl font-bold text-navy">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-base text-ink/70">{empty}</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {rows.map(render)}
        </ul>
      )}
    </section>
  );
}

const plan = (s: AccountSessionRow, linkable: boolean, closed: boolean) => (
  <Row key={s.id} s={s} linkable={linkable}>
    {!closed ? (
      <PlanButtons
        sessionId={s.id}
        status={s.rsvp}
        bookmarked={s.bookmarked}
        full={s.full}
        commitment={s.commitment}
        open={s.open}
        conflicts={s.conflicts}
      />
    ) : (
      s.rsvp && (
        <span className="text-xs text-ink/50">
          {s.rsvp === "going" ? "Going" : "Waitlisted"}
          {s.bookmarked && " · Bookmarked"}
        </span>
      )
    )}
  </Row>
);

export default function SessionsPanel({
  sessions,
  linkable,
  closed = false,
}: {
  sessions: AccountSessions;
  linkable: boolean;
  /** Attendee actions are off for this viewer: the lists are read-only. */
  closed?: boolean;
}) {
  return (
    <div className="flex max-w-[960px] flex-col gap-12">
      <List
        title="Sessions you're running"
        empty="You're not hosting any sessions."
        rows={sessions.running}
        render={(s) => (
          <Row key={s.id} s={s} linkable={linkable}>
            <span className="flex flex-wrap items-center gap-x-3 text-xs text-ink/50">
              {s.lead ? "Lead host" : "Co-host"}
              <Link
                href={`/account/sessions/${s.id}`}
                className="underline underline-offset-2 hover:text-meeple"
              >
                Edit
              </Link>
            </span>
          </Row>
        )}
      />
      <List
        title="Your RSVPs"
        empty={
          closed
            ? "You didn't RSVP to anything."
            : "You haven't RSVP'd to anything yet."
        }
        rows={sessions.plans}
        render={(s) => plan(s, linkable, closed)}
      />
      {sessions.bookmarks.length > 0 && (
        <List
          title="Bookmarked"
          empty=""
          rows={sessions.bookmarks}
          render={(s) => plan(s, linkable, closed)}
        />
      )}
      {closed && (
        <p className="text-sm text-ink/60">
          Metagame 2026 is over, so RSVPs and bookmarks are closed.
        </p>
      )}
    </div>
  );
}
