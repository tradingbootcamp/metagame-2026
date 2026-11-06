import { connection } from "next/server";
import SignIn from "../SignIn";
import type { DeskTicket } from "./desk";
import ProblemButton from "./ProblemButton";
import SearchBox from "./SearchBox";
import TicketCard from "./TicketCard";
import { toolAccess } from "@/lib/admin-auth";
import {
  attendeeName,
  CHECKIN_MIN_CHARS,
  checkinState,
  formatPacificTime,
  groupByPack,
  packKey,
  parseCheckinQuery,
  type CheckinAccount,
} from "@/lib/checkin";
import {
  checkinAccounts,
  checkinCounts,
  searchCheckinTickets,
} from "@/lib/checkin-store";
import { ticketLabel, type TicketRow } from "@/lib/ticket-store";

export default async function CheckinPage(
  props: PageProps<"/backstage/checkin">,
) {
  await connection();
  const sp = await props.searchParams;
  const { text: q, badge } = parseCheckinQuery(String([sp.q].flat()[0] ?? ""));
  const self = `/backstage/checkin${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  const access = await toolAccess("checkin.manage");
  if (!access) return <SignIn next={self} />;

  const [counts, rows] = await Promise.all([
    checkinCounts(),
    searchCheckinTickets(q),
  ]);
  const { byId, byEmail } = await checkinAccounts(rows);
  const owners = new Set(rows.map((t) => t.ownerUserId));
  // A pack's buyer is offered once, on its first unclaimed ticket.
  const buyerOffered = new Set<string>();
  const suggested = (t: TicketRow): CheckinAccount | null => {
    if (t.ownerUserId !== null) return null;
    if (t.holderUserId !== null) return byId.get(t.holderUserId) ?? null;
    if (t.purchaserEmail === null) return null;
    const pack = packKey(t.paymentId);
    if (pack !== null) {
      if (buyerOffered.has(pack)) return null;
      buyerOffered.add(pack);
    }
    const buyer = byEmail.get(t.purchaserEmail);
    return buyer && !owners.has(buyer.id) ? buyer : null;
  };
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
      badge: t.badgeCode,
      state: checkinState(t),
      checkedIn: t.checkedInAt
        ? { at: formatPacificTime(t.checkedInAt), by: by?.name ?? "someone" }
        : null,
      suggested: suggested(t),
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
      {q.length > 0 && q.length < CHECKIN_MIN_CHARS && badge === null && (
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
