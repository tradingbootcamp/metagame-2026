import { connection } from "next/server";
import { PasswordForm } from "../SignInForms";
import { isConfigured, readSession } from "@/lib/admin-auth";

// Liam ERD static site, generated into public/schema-erd at build time
// (scripts/build-erd.mjs). The files under public/ are fetchable without the
// password, like arbiter's; the schema is also in the public repo, so this gate
// is about keeping the tool off search engines, not secrecy.
export default async function AdminSchemaPage() {
  await connection();

  if (!isConfigured()) {
    return (
      <p className="mx-auto max-w-sm px-4 py-8 text-sm text-ink/70">
        Team tools aren’t configured on this deploy — set{" "}
        <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code>.
      </p>
    );
  }
  if (!(await readSession())) {
    return (
      <div className="px-4 py-8">
        <PasswordForm />
      </div>
    );
  }

  // Everything below the 3.5rem header bar (plus its 1px border).
  return (
    <iframe
      src="/schema-erd/index.html?showMode=ALL_FIELDS"
      title="Database schema ER diagram. Blank in local dev until you run pnpm erd:build."
      className="block h-[calc(100dvh-3.5rem-1px)] w-full border-0 bg-white"
    />
  );
}
