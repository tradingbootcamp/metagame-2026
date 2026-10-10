import Link from "next/link";
import { accountsConfigured, currentSession } from "@/lib/auth";

// The sign-in card for a team tool: an account with the admin role, or, until
// the team has accounts, the tool's shared password.
export default async function ToolSignIn({
  title,
  next,
  passwordConfigured,
  passwordEnvs,
  passwordForm,
}: {
  title: string;
  /** Where /login sends them back to. */
  next: string;
  passwordConfigured: boolean;
  /** Named in the "nothing configured" message. */
  passwordEnvs: [string, string];
  passwordForm: React.ReactNode;
}) {
  const accounts = accountsConfigured();
  if (!accounts && !passwordConfigured) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        {title} isn’t configured on this deploy — set{" "}
        <code>{passwordEnvs[0]}</code> and <code>{passwordEnvs[1]}</code>, or
        the database and <code>BETTER_AUTH_SECRET</code> for accounts.
      </p>
    );
  }
  const session = accounts ? await currentSession() : null;

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm">
      <h1 className="font-bebas mb-4 text-2xl tracking-wide text-navy">
        {title}
      </h1>
      {accounts &&
        (session ? (
          <p className="text-sm text-ink/70">
            You’re signed in as <strong>{session.user.email}</strong>, which
            doesn’t have team access. Ask an admin to grant it from{" "}
            <code>/admin/users</code>, or{" "}
            <Link href="/account" className="underline hover:text-meeple">
              switch accounts
            </Link>
            .
          </p>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="block w-full rounded-lg bg-meeple px-4 py-2.5 text-center font-roboto font-semibold text-white transition-colors hover:bg-meeple-dark"
          >
            Sign in with your account
          </Link>
        ))}
      {accounts && passwordConfigured && (
        <p className="my-4 text-center text-xs tracking-wide text-ink/40 uppercase">
          or use the team password
        </p>
      )}
      {passwordConfigured && passwordForm}
    </div>
  );
}
