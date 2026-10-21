import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PasswordForm, ProfileForm, SignOutButton } from "./AccountForms";
import AccountTabs from "./AccountTabs";
import AvatarForm from "./AvatarForm";
import SessionsPanel from "./SessionsPanel";
import TicketsPanel from "./TicketsPanel";
import { parseAccountTab } from "./tabs";
import { getDb, schema } from "@/db";
import { accountSessions } from "@/lib/account-sessions";
import { currentSession, hasPassword } from "@/lib/auth";
import { prefillDiscord } from "@/lib/discord-handle";
import {
  loadRsvpCounts,
  loadSchedule,
  loadViewerPlans,
} from "@/lib/schedule-store";
import { emailKey, ticketsForUser } from "@/lib/ticket-store";
import { ticketView } from "@/lib/ticket-view";

export const metadata: Metadata = {
  title: "Account — Metagame 2026",
  robots: { index: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; tab?: string }>;
}) {
  const { notice, tab } = await searchParams;
  const initialTab = parseAccountTab(tab);
  const session = await currentSession();
  if (!session)
    redirect(
      `/login?next=${encodeURIComponent(initialTab === "profile" ? "/account" : `/account?tab=${initialTab}`)}`,
    );
  const { user } = session;

  const email = emailKey(user.email);
  const [[profile], passwordSet, rows, schedule, plans, counts] =
    await Promise.all([
      getDb()
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, user.id))
        .limit(1),
      hasPassword(user.id),
      ticketsForUser(user.id, email),
      loadSchedule(),
      loadViewerPlans(user.id),
      loadRsvpCounts(),
    ]);
  const tickets = rows.map((t) => ticketView(t, user.id, email));

  return (
    // Same measure and top clearance as ContentPage, without its title block.
    <div className="mx-auto max-w-[1180px] px-8 pt-28 pb-20">
      {notice === "welcome-back" && (
        <p className="mb-8 text-base text-ink/70">
          Looks like you already had an account, so we signed you in.
        </p>
      )}
      <AccountTabs
        initial={initialTab}
        panels={{
          profile: (
            <div className="flex max-w-[960px] flex-col gap-10">
              <AvatarForm
                imageUrl={profile?.imageUrl ?? null}
                name={profile?.preferredName || user.name}
              />
              <div className="grid gap-12 md:grid-cols-2">
                <ProfileForm
                  email={user.email}
                  initialValues={{
                    name: user.name,
                    preferredName: profile?.preferredName ?? "",
                    pronouns: profile?.pronouns ?? "",
                    discordHandle: prefillDiscord(
                      profile?.discordHandle,
                      rows,
                      email,
                    ),
                    bio: profile?.bio ?? "",
                    isPublic: profile?.isPublic ?? false,
                  }}
                />
                <div className="flex flex-col gap-10">
                  <PasswordForm hasPassword={passwordSet} email={user.email} />
                  <SignOutButton />
                </div>
              </div>
            </div>
          ),
          // TicketsPanel carries its own top margin from when it sat below the profile.
          tickets: (
            <div className="[&>section]:mt-0">
              <TicketsPanel tickets={tickets} />
            </div>
          ),
          sessions: (
            <SessionsPanel
              sessions={accountSessions(
                user.id,
                schedule.sessions,
                schedule.locations,
                plans,
                counts,
              )}
            />
          ),
        }}
      />
    </div>
  );
}
