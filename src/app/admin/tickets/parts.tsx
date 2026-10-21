import Link from "next/link";
import { personLabel, type TicketPerson } from "@/lib/admin-tickets";
import type { TicketRow } from "@/lib/ticket-store";

export const TAG = "rounded px-1.5 py-0.5 text-xs font-semibold";

export const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Los_Angeles",
});

export const profileHref = (userId: string) => `/admin/users/${userId}`;

export function PersonLink({ person }: { person: TicketPerson | null }) {
  if (!person) return <span className="text-ink/40">—</span>;
  const label = personLabel(person);
  const showEmail = person.email && person.email !== label;
  return (
    <span className="flex flex-col">
      {person.userId ? (
        <Link
          href={profileHref(person.userId)}
          className="text-navy underline-offset-2 hover:text-meeple hover:underline"
        >
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      )}
      {showEmail && (
        <span className="font-mono text-xs text-ink/50">{person.email}</span>
      )}
    </span>
  );
}

const STATUS_CLASS: Record<TicketRow["status"], string> = {
  paid: "bg-moss/15 text-moss",
  pending: "bg-tan/30 text-ink",
  failed: "bg-meeple/10 text-meeple",
  underpaid: "bg-meeple/10 text-meeple",
};

export function StatusTag({ status }: { status: TicketRow["status"] }) {
  return (
    <span className={`${TAG} capitalize ${STATUS_CLASS[status]}`}>
      {status}
    </span>
  );
}

export function TestTag() {
  return <span className={`${TAG} bg-navy/10 text-navy`}>Test</span>;
}
