import { connection } from "next/server";
import { PasswordForm } from "../links/SignInForms";
import { isConfigured, readSession } from "@/lib/admin-auth";

// Liam ERD static site, generated into public/schema-erd at build time
// (scripts/build-erd.mjs). The files under public/ are fetchable without the
// password, like arbiter's; the schema is also in the public repo, so this gate
// is about keeping the tool off search engines, not secrecy.
export default async function AdminSchemaPage() {
  await connection();

  if (!isConfigured()) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        Team tools aren’t configured on this deploy — set{" "}
        <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code>.
      </p>
    );
  }
  if (!(await readSession())) return <PasswordForm />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/70">
        Built from the migration SQL. Drag to pan, scroll to zoom, click a table
        to highlight what it connects to. Blank in local dev? Run{" "}
        <code>pnpm erd:build</code>.
      </p>
      <iframe
        src="/schema-erd/index.html?showMode=ALL_FIELDS"
        title="Database schema ER diagram"
        className="h-[calc(100vh-11rem)] w-full rounded-xl border border-line bg-white"
      />
    </div>
  );
}
