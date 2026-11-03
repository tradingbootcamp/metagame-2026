import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { activeClasses } from "@/lib/megagame-levels";
import { playerLinkTarget } from "@/lib/megagame-links";
import ContentPage from "@/v2/components/ContentPage";
import ClassBadges from "@/v2/components/megagame/ClassBadges";

export const metadata: Metadata = {
  title: "Megagame — Metagame 2026",
  robots: { index: false, follow: false },
};

// A badge's QR link. Open to everyone, and shows only the account name and
// class levels, nothing from the profile.
export default async function PlayerLinkPage(props: PageProps<"/p/[code]">) {
  await connection();
  const { code } = await props.params;
  const target = await playerLinkTarget(code);
  if ("redirect" in target) redirect(target.redirect);
  const { player } = target;
  if (!player) notFound();
  return (
    <ContentPage eyebrow="Megagame" title={player.name}>
      {activeClasses(player.levels).length > 0 ? (
        <ClassBadges levels={player.levels} />
      ) : (
        <p className="text-base text-ink/70">Not in a faction yet.</p>
      )}
    </ContentPage>
  );
}
