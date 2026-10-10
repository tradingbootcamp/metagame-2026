import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "../auth-actions";
import BackToTools from "../BackToTools";
import ViewToggle from "./ViewToggle";
import { readSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Database Schema — Metagame",
  robots: { index: false, follow: false },
};

export default async function AdminSchemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/95 backdrop-blur">
        {/* Fixed height: the diagram page sizes its iframe to the viewport minus this bar. */}
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <nav className="flex items-center gap-4">
            <BackToTools />
            <Link
              href="/admin/schema"
              className="font-bebas text-xl tracking-wide text-navy"
            >
              Database Schema
            </Link>
            {session && <ViewToggle />}
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
      {/* Pages pick their own width: the diagram is full-bleed, the list is a column. */}
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
