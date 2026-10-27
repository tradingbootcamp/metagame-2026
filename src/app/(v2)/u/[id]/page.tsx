import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { loadProfileView } from "./data";
import { canSeeSchedule } from "../../schedule/data";
import { loadSchedule } from "@/lib/schedule-store";
import {
  PUBLIC_AUDIENCE,
  userSessions,
  websiteLabel,
} from "@/lib/user-profile";
import ContentPage from "@/v2/components/ContentPage";
import UserSessions from "@/v2/components/schedule/UserSessions";

// Public attendee profile. Everything here is something the person typed into
// their own profile form, plus the sessions they're hosting; see
// PUBLIC_AUDIENCE in src/lib/user-profile.ts for what's deliberately left out.

export async function generateMetadata(
  props: PageProps<"/u/[id]">,
): Promise<Metadata> {
  await connection();
  const view = await loadProfileView((await props.params).id);
  return {
    title: view ? `${view.profile.name} — Metagame 2026` : "Metagame 2026",
    // Attendees opted in to being visible to other attendees, not to search.
    robots: { index: false, follow: false },
  };
}

export default async function PublicProfilePage(props: PageProps<"/u/[id]">) {
  await connection();
  const { id } = await props.params;
  const view = await loadProfileView(id);
  if (!view) notFound();
  const { profile, preview } = view;

  const [schedule, linkable] = await Promise.all([
    loadSchedule(),
    canSeeSchedule(),
  ]);
  const { sessions, locations } = userSessions(
    id,
    schedule,
    null,
    PUBLIC_AUDIENCE,
  );

  return (
    <ContentPage title={profile.name} wide>
      {preview && (
        <p className="mb-8 rounded-xl border border-tan/60 bg-peach/30 px-4 py-3 text-sm text-ink/80">
          Only you can see this page. Tick “Show my profile to other attendees”
          on your{" "}
          <Link href="/account" className="underline underline-offset-2">
            account
          </Link>{" "}
          to publish it.
        </p>
      )}
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
        <aside className="flex shrink-0 flex-col gap-4 lg:w-[260px]">
          {profile.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- already avatar-sized
            <img
              src={profile.imageUrl}
              alt=""
              className="size-40 rounded-full object-cover"
            />
          )}
          {profile.pronouns && (
            <p className="text-base text-ink/70">{profile.pronouns}</p>
          )}
          {profile.website && (
            <a
              href={profile.website}
              rel="noopener nofollow ugc"
              className="text-base break-all text-navy underline underline-offset-2 hover:text-meeple"
            >
              {websiteLabel(profile.website)}
            </a>
          )}
          {profile.bio && (
            <p className="text-base whitespace-pre-line text-ink/80">
              {profile.bio}
            </p>
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <UserSessions
            sessions={sessions}
            locations={locations}
            roles={["hosting"]}
            linkable={linkable}
            emptyLabel={`${profile.name} isn't hosting any sessions yet.`}
          />
        </div>
      </div>
    </ContentPage>
  );
}
