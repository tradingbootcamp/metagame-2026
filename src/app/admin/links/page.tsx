import { connection } from "next/server";
import { NameForm, PasswordForm } from "../SignInForms";
import LinksTool from "./LinksTool";
import { isConfigured, readSession } from "@/lib/admin-auth";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import { listTrackingLinks, loadLinkOptions } from "@/lib/tracking-links";

export default async function AdminLinksPage() {
  // Per-request on every branch, or the unconfigured/password branch gets
  // baked in as static at build time.
  await connection();

  if (!isConfigured()) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        Team tools aren’t configured on this deploy — set{" "}
        <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code>.
      </p>
    );
  }

  const session = await readSession();
  if (!session) return <PasswordForm />;
  if (!session.identity) return <NameForm />;

  const [links, options, origin] = await Promise.all([
    listTrackingLinks(),
    loadLinkOptions(),
    siteOriginFromHeaders(),
  ]);
  return (
    <LinksTool
      links={links}
      options={options}
      origin={origin}
      me={session.identity.name}
    />
  );
}
