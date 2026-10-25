import { connection } from "next/server";
import SignIn from "../SignIn";
import { NameForm } from "../SignInForms";
import LinksTool from "./LinksTool";
import { toolAccess } from "@/lib/admin-auth";
import { matchLabel } from "@/lib/name-match";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import { listTrackingLinks, loadLinkOptions } from "@/lib/tracking-links";

export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  // Per-request on every branch, or the sign-in branch gets baked in as
  // static at build time.
  await connection();
  const view = (await searchParams).view === "posters" ? "posters" : "all";

  const access = await toolAccess("links.manage");
  if (!access)
    return (
      <SignIn
        next={
          view === "posters"
            ? "/backstage/links?view=posters"
            : "/backstage/links"
        }
      />
    );
  if (!access.name) return <NameForm />;

  const [links, options, origin] = await Promise.all([
    listTrackingLinks(),
    loadLinkOptions(),
    siteOriginFromHeaders(),
  ]);
  const me = matchLabel(
    access.name,
    links.map((l) => l.createdBy),
  );
  return (
    <LinksTool
      links={links}
      options={options}
      origin={origin}
      me={me}
      view={view}
    />
  );
}
