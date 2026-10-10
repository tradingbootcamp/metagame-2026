import Link from "next/link";
import { Card } from "@/app/admin/ui";
import { accountsConfigured, currentSession } from "@/lib/auth";

// The sign-in card for a team tool: an account with the admin role, or, until
// the team has accounts, the tool's shared password.
export default async function ToolSignIn({
  title,
  next,
  passwordForm,
}: {
  title: string;
  /** Where /login sends them back to. */
  next: string;
  /** The shared-password form, when that fallback is configured. */
  passwordForm?: React.ReactNode;
}) {
  const accounts = accountsConfigured();
  if (!accounts && !passwordForm) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        {title} isn’t configured on this deploy. See <code>.env.example</code>.
      </p>
    );
  }
  const session = accounts ? await currentSession().catch(() => null) : null;

  return (
    <Card title={title}>
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
      {accounts && passwordForm && (
        <p className="my-4 text-center text-xs tracking-wide text-ink/40 uppercase">
          or use the team password
        </p>
      )}
      {passwordForm}
    </Card>
  );
}
