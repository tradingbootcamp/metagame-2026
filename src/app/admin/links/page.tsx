import { connection } from "next/server";
import SignIn from "../SignIn";
import { NameForm } from "../SignInForms";
import LinksTool from "./LinksTool";
import { adminAccess } from "@/lib/admin-auth";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import { listTrackingLinks, loadLinkOptions } from "@/lib/tracking-links";

export default async function AdminLinksPage() {
  // Per-request on every branch, or the sign-in branch gets baked in as
  // static at build time.
  await connection();

  const access = await adminAccess();
  if (!access) return <SignIn next="/admin/links" />;
  if (!access.name) return <NameForm />;

  const [links, options, origin] = await Promise.all([
    listTrackingLinks(),
    loadLinkOptions(),
    siteOriginFromHeaders(),
  ]);
  // "brian" and "Brian" are one person: reuse the spelling already on their links.
  const me =
    links.find((l) => l.createdBy.toLowerCase() === access.name.toLowerCase())
      ?.createdBy ?? access.name;
  return <LinksTool links={links} options={options} origin={origin} me={me} />;
}
