import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PasswordForm, ProfileForm, SignOutButton } from "./AccountForms";
import { getDb, schema } from "@/db";
import { currentSession, hasPassword } from "@/lib/auth";
import ContentPage from "@/v2/components/ContentPage";

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

  return (
    <ContentPage
      eyebrow="Account"
      title={user.name || "Your account"}
      intro={
        <p>
          {notice === "welcome-back" &&
            "Looks like you already had an account, so we signed you in. "}
          Signed in as {user.email}.
        </p>
      }
    >
      <div className="grid max-w-[960px] gap-12 md:grid-cols-2">
        <ProfileForm
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
    </ContentPage>
  );
}
