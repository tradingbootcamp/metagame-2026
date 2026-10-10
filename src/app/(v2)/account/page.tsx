import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PasswordForm, ProfileForm, SignOutButton } from "./AccountForms";
import TicketsPanel, { type TicketView } from "./TicketsPanel";
import { getDb, schema } from "@/db";
import { currentSession, hasPassword } from "@/lib/auth";
import { formatTicketCode } from "@/lib/ticket-code";
import { ticketsForUser } from "@/lib/ticket-store";

export const metadata: Metadata = {
  title: "Account — Metagame 2026",
  robots: { index: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const session = await currentSession();
  if (!session) redirect("/login?next=/account");
  const { user } = session;

  const [profile] = await getDb()
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);
  const passwordSet = await hasPassword(user.id);
  const tickets: TicketView[] = (await ticketsForUser(user.id, user.email)).map(
    (t) => ({
      id: t.paymentId,
      tier: t.tier ?? "Metagame 2026 ticket",
      status: t.status,
      test: t.test,
      mine: t.ownerUserId === user.id,
      claimed: t.ownerUserId !== null,
      // Only the buyer sees the code; it's what they hand to whoever attends.
      code:
        t.purchaserEmail === user.email.toLowerCase()
          ? formatTicketCode(t.ticketCode)
          : null,
    }),
  );

  return (
    // Same measure and top clearance as ContentPage, without its title block.
    <div className="mx-auto max-w-[1180px] px-8 pt-28 pb-20">
      {notice === "welcome-back" && (
        <p className="mb-8 text-base text-ink/70">
          Looks like you already had an account, so we signed you in.
        </p>
      )}
      <div className="grid max-w-[960px] gap-12 md:grid-cols-2">
        <ProfileForm
          email={user.email}
          initialValues={{
            name: user.name,
            preferredName: profile?.preferredName ?? "",
            pronouns: profile?.pronouns ?? "",
            discordHandle: profile?.discordHandle ?? "",
            bio: profile?.bio ?? "",
            isPublic: profile?.isPublic ?? false,
          }}
        />
        <div className="flex flex-col gap-10">
          <PasswordForm hasPassword={passwordSet} email={user.email} />
          <SignOutButton />
        </div>
      </div>
      <TicketsPanel tickets={tickets} />
    </div>
  );
}
