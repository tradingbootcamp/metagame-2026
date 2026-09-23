import type { Metadata } from "next";
import Link from "next/link";
import { signOut, switchGrader } from "./actions";
import { readSession } from "@/lib/grader-auth";

export const metadata: Metadata = {
  title: "Session Rubric — Metagame",
  robots: { index: false, follow: false },
};

export default async function GradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/grade"
            className="font-bebas text-xl tracking-wide text-navy"
          >
            Session Rubric
          </Link>
          {session && (
            <div className="flex items-center gap-3 text-sm text-ink/60">
              {session.grader && (
                <form action={switchGrader}>
                  <button type="submit" className="hover:text-meeple">
                    {session.grader.name}
                  </button>
                </form>
              )}
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
      <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
