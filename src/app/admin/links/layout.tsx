import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "../auth-actions";
import { readSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Tracking Links — Metagame",
  robots: { index: false, follow: false },
};

export default async function AdminLinksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-baseline gap-4">
            <Link
              href="/admin/links"
              className="font-bebas text-xl tracking-wide text-navy"
            >
              Tracking Links
            </Link>
            <Link
              href="/admin/promo"
              className="text-sm text-ink/60 underline-offset-2 hover:text-meeple hover:underline"
            >
              Promo codes
            </Link>
            <Link
              href="/admin"
              className="text-sm text-ink/60 underline-offset-2 hover:text-meeple hover:underline"
            >
              All tools
            </Link>
          </nav>
          {session && (
            <div className="flex items-center gap-3 text-sm text-ink/60">
              {session.identity && <span>{session.identity.name}</span>}
              <form action={signOut}>
                <button
                  type="submit"
                  className="underline underline-offset-2 hover:text-meeple"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
