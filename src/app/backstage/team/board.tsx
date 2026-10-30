"use client";

import { createContext, useContext } from "react";
import type { Result } from "./actions";
import {
  isOverdue,
  staffing,
  type Area,
  type Board,
  type Person,
  type Role,
  type Staffing,
} from "@/lib/team";

// What every part of the team tool reads: the board, lookups by id, who's
// signed in, and `act`, which runs a server action and reports how it went.

export type Dialog =
  | { kind: "role"; id: string | null }
  | { kind: "person"; id: string | null }
  | {
      kind: "task";
      id: string | null;
      preset?: { ownerId?: string; areaId?: string; roleId?: string };
    }
  | { kind: "area"; id: string | null }
  | { kind: "people" }
  | {
      kind: "tasks";
      preset?: { ownerId?: string; areaId?: string; roleId?: string };
    }
  | { kind: "import" };

export type BoardCtx = {
  board: Board;
  today: string;
  /** The signed-in account's person on the board, if linked. */
  me: string | null;
  canManage: boolean;
  pending: boolean;
  person: (id: string | null) => Person | undefined;
  area: (id: string | null) => Area | undefined;
  role: (id: string | null) => Role | undefined;
  /** Runs a server action; `done` is called if it succeeds. */
  act: (work: () => Promise<Result>, done?: () => void) => void;
  open: (d: Dialog) => void;
};

export const BoardContext = createContext<BoardCtx | null>(null);

export function useBoard(): BoardCtx {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard outside the team tool");
  return ctx;
}

const DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Wed, Nov 4" for an ISO day. */
export const dayLabel = (iso: string) => DAY.format(new Date(`${iso}T12:00Z`));

export function DueChip({
  dueOn,
  due,
  done = false,
}: {
  dueOn: string | null;
  due?: string | null;
  done?: boolean;
}) {
  const { today } = useBoard();
  if (!dueOn && !due) return null;
  const late = !done && isOverdue(dueOn, today);
  const soon = !done && !late && dueOn === today;
  return (
    <span
      title={due ?? undefined}
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        late
          ? "bg-meeple text-white"
          : soon
            ? "bg-tan/30 text-navy"
            : "bg-ink/5 text-ink/70"
      }`}
    >
      {late ? "Overdue · " : soon ? "Today · " : ""}
      {dueOn ? dayLabel(dueOn) : due}
    </span>
  );
}

const STAFFING: Record<Staffing, { label: string; className: string }> = {
  open: { label: "Needs someone", className: "bg-meeple/10 text-meeple" },
  short: { label: "Needs more", className: "bg-tan/25 text-navy" },
  filled: { label: "Filled", className: "bg-moss/15 text-moss" },
  ongoing: { label: "Taking more", className: "bg-sky text-navy" },
  closed: { label: "Closed", className: "bg-ink/5 text-ink/50" },
};

export function StaffingChip({ role }: { role: Role }) {
  const s = staffing(role);
  const label =
    role.status === "done"
      ? "Done"
      : role.status === "dropped"
        ? "Dropped"
        : STAFFING[s].label;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${STAFFING[s].className}`}
    >
      {label}
    </span>
  );
}

/** "1 of 2", or "3 so far" for a role that takes anyone. */
export function seatsLabel(role: Role): string {
  return role.needed > 0
    ? `${role.holders.length} of ${role.needed}`
    : `${role.holders.length} so far`;
}

/** A person's name that opens their card. */
export function PersonLink({ id, muted }: { id: string; muted?: boolean }) {
  const { person, open, me } = useBoard();
  const p = person(id);
  if (!p) return null;
  return (
    <button
      type="button"
      onClick={() => open({ kind: "person", id })}
      className={`text-left underline-offset-2 hover:text-meeple hover:underline ${
        muted ? "text-ink/60" : "text-navy"
      } ${id === me ? "font-semibold" : ""}`}
    >
      {p.name}
      {id === me && <span className="text-ink/50"> (you)</span>}
    </button>
  );
}

/** Names, commas between, each opening its card. */
export function People({
  ids,
  empty = "Nobody yet",
  muted,
}: {
  ids: string[];
  empty?: string;
  muted?: boolean;
}) {
  if (ids.length === 0)
    return <span className="text-ink/40 italic">{empty}</span>;
  return (
    <span>
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ", "}
          <PersonLink id={id} muted={muted} />
        </span>
      ))}
    </span>
  );
}

export const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition-colors ${
    active
      ? "border-navy bg-navy text-cream"
      : "border-line bg-white text-ink/70 hover:border-navy hover:text-navy"
  }`;

export const panelClass = "rounded-xl border border-line bg-white";
