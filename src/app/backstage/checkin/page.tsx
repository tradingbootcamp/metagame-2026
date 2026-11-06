import { connection } from "next/server";
import SignIn from "../SignIn";
import type { DeskTicket } from "./desk";
import ProblemButton from "./ProblemButton";
import SearchBox from "./SearchBox";
import TicketCard from "./TicketCard";
import { toolAccess } from "@/lib/admin-auth";
import { formatBadgeCode } from "@/lib/badge-code";
import {
  attendeeName,
  CHECKIN_MIN_CHARS,
  checkinState,
  formatPacificTime,
  groupByPack,
  parseCheckinQuery,
} from "@/lib/checkin";
import {
  checkinAccounts,
  checkinCounts,
  searchCheckinTickets,
} from "@/lib/checkin-store";
import { ticketLabel } from "@/lib/ticket-store";

export default async function CheckinPage(
  props: PageProps<"/backstage/checkin">,
) {
  await connection();
  const sp = await props.searchParams;
  const { text: q } = parseCheckinQuery(String([sp.q].flat()[0] ?? ""));
  const self = `/backstage/checkin${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  const access = await toolAccess("checkin.manage");
  if (!access) return <SignIn next={self} />;

  const [counts, rows] = await Promise.all([
    checkinCounts(),
    searchCheckinTickets(q),
  ]);
  const { byId, byEmail } = await checkinAccounts(rows);
  const tickets: DeskTicket[] = rows.map((t) => {
    const by = t.checkedInBy ? byId.get(t.checkedInBy) : undefined;
    return {
      paymentId: t.paymentId,
      name: attendeeName({
        ownerName: t.ownerUserId
          ? (byId.get(t.ownerUserId)?.name ?? null)
          : null,
        holderName: t.holderUserId
          ? (byId.get(t.holderUserId)?.name ?? null)
          : null,
        purchaserName: t.purchaserName,
      }),
      purchaserEmail: t.purchaserEmail,
      tier: ticketLabel(t.tier),
      badge: t.badgeCode === null ? null : formatBadgeCode(t.badgeCode),
      state: checkinState(t),
      checkedIn: t.checkedInAt
        ? { at: formatPacificTime(t.checkedInAt), by: by?.name ?? "someone" }
        : null,
      suggested:
        t.ownerUserId === null && t.purchaserEmail
          ? (byEmail.get(t.purchaserEmail) ?? null)
          : null,
    };
  });
  const groups = groupByPack(tickets);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg text-ink/80">
          <strong className="text-navy">{counts.checkedIn}</strong> checked in /{" "}
          {counts.paid} paid tickets
        </p>
        <ProblemButton q={q} />
      </div>
      <SearchBox initial={q} />
      {q.length > 0 && q.length < CHECKIN_MIN_CHARS && (
        <p className="text-sm text-ink/60">Type at least two characters.</p>
      )}
      {q.length >= CHECKIN_MIN_CHARS && tickets.length === 0 && (
        <p className="text-sm text-ink/60">
          No ticket matches “{q}”. Try the purchaser’s email or the ticket code
          from their confirmation.
        </p>
      )}
      <ul className="flex flex-col gap-4">
        {groups.map((g) =>
          g.pack === null ? (
            <li key={g.tickets[0].paymentId}>
              <TicketCard ticket={g.tickets[0]} q={q} />
            </li>
          ) : (
            <li
              key={g.pack}
              className="flex flex-col gap-3 rounded-xl border border-dashed border-navy/40 p-3"
            >
              <p className="text-sm text-ink/70">
                <span className="font-semibold text-navy">
                  Family &amp; Friends Pack
                </span>{" "}
                · {g.tickets.length} tickets
                {g.tickets[0].purchaserEmail && (
                  <>
                    {" "}
                    · bought by{" "}
                    <span className="font-mono">
                      {g.tickets[0].purchaserEmail}
                    </span>
                  </>
                )}
              </p>
              {g.tickets.map((t) => (
                <TicketCard key={t.paymentId} ticket={t} q={q} />
              ))}
            </li>
          ),
        )}
      </ul>
    </>
  );
}
