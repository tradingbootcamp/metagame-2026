import { eq } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import {
  PersonLink,
  profileHref,
  shortDate,
  StatusTag,
  TestTag,
} from "./parts";
import { fieldClass, smallButtonClass } from "../ui";
import ToolSignIn from "@/components/ToolSignIn";
import { getDb, schema } from "@/db";
import { peopleMatch, ticketPeople } from "@/lib/admin-tickets";
import { ticketAccounts } from "@/lib/admin-store";
import { adminSession } from "@/lib/auth";
import { formatTicketCode } from "@/lib/ticket-code-format";
import { allTickets, ticketLabel, ticketsForUser } from "@/lib/ticket-store";

const COLUMNS = [
  "Tier",
  "Status",
  "Code",
  "Buyer",
  "Holder",
  "Claimer",
  "Claimed",
  "Source",
  "Created",
];

// Account-only, like /admin/users: it lists every buyer's email.
export default async function AdminTicketsPage(
  props: PageProps<"/admin/tickets">,
) {
  await connection();

  const session = await adminSession();
  if (!session) return <ToolSignIn title="Tickets" next="/admin/tickets" />;

  const params = await props.searchParams;
  const q = String(params.q ?? "").trim();
  const userId = String(params.user ?? "").trim();

  const [forUser] = userId
    ? await getDb()
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        })
        .from(schema.user)
        .where(eq(schema.user.id, userId))
        .limit(1)
    : [];
  const rows = userId
    ? forUser
      ? await ticketsForUser(forUser.id, forUser.email)
      : []
    : await allTickets();
  const { accounts, byEmail } = await ticketAccounts(rows);
  const shown = rows
    .map((t) => ({ t, people: ticketPeople(t, accounts, byEmail) }))
    .filter(({ people }) => peopleMatch(people, q));

  return (
    <div className="space-y-4">
      <form method="get" className="flex max-w-md gap-2">
        {userId && <input type="hidden" name="user" value={userId} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          className={fieldClass}
        />
        <button type="submit" className={smallButtonClass}>
          Search
        </button>
      </form>
      <p className="text-sm text-ink/60">
        {shown.length} {shown.length === 1 ? "ticket" : "tickets"}
        {userId && (
          <>
            {" "}
            bought, held or claimed by{" "}
            {forUser ? (
              <Link
                href={profileHref(forUser.id)}
                className="text-navy hover:text-meeple hover:underline"
              >
                {forUser.name.trim() || forUser.email}
              </Link>
            ) : (
              "an unknown account"
            )}{" "}
            ·{" "}
            <Link
              href="/admin/tickets"
              className="text-navy hover:text-meeple hover:underline"
            >
              all tickets
            </Link>
          </>
        )}
        {q && ` matching “${q}”`}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c} className="px-4 py-2 font-medium whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line align-top">
            {shown.map(({ t, people }) => (
              <tr key={t.paymentId}>
                <td className="px-4 py-2">{ticketLabel(t.tier)}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className="inline-flex gap-1">
                    <StatusTag status={t.status} />
                    {t.test && <TestTag />}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                  {formatTicketCode(t.ticketCode)}
                </td>
                <td className="px-4 py-2">
                  <PersonLink person={people.buyer} />
                </td>
                <td className="px-4 py-2">
                  {people.holderIsBuyer ? (
                    <span className="text-ink/50">Buyer</span>
                  ) : (
                    <PersonLink person={people.holder} />
                  )}
                </td>
                <td className="px-4 py-2">
                  <PersonLink person={people.claimer} />
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {t.claimedAt ? shortDate.format(t.claimedAt) : "—"}
                </td>
                <td className="px-4 py-2">{t.source}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {shortDate.format(t.createdAt)}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-6 text-center text-ink/50"
                >
                  No tickets{q && " match"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
