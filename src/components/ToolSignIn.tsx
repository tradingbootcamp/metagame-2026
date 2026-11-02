import Link from "next/link";
import { Card } from "@/app/backstage/ui";
import { accountsConfigured, currentSession } from "@/lib/auth";

// The sign-in card for a team tool: an account holding the tool's permission.
export default async function ToolSignIn({
  title,
  next,
}: {
  title: string;
  /** Where /login sends them back to. */
  next: string;
}) {
  if (!accountsConfigured()) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        {title} isn’t configured on this deploy. See <code>.env.example</code>.
      </p>
    );
  }
  const session = await currentSession().catch(() => null);

  return (
    <Card title={title}>
      {session ? (
        <p className="text-sm text-ink/70">
          You’re signed in as <strong>{session.user.email}</strong>, which
          doesn’t have access to this tool. Ask an admin to grant it from{" "}
          <code>/backstage/users</code>, or{" "}
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
      )}
    </Card>
  );
}
