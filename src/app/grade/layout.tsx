import type { Metadata } from "next";
import Link from "next/link";
import { signOut, switchGrader } from "./actions";
import { gradeAccess } from "@/lib/grader-auth";
import { identityLabel } from "@/lib/grader-identity";

export const metadata: Metadata = {
  title: "Session Rubric — Metagame",
  robots: { index: false, follow: false },
};

export default async function GradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await gradeAccess();

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
          {access && (
            <div className="flex items-center gap-3 text-sm text-ink/60">
              {access.via === "account" ? (
                <Link href="/account" className="hover:text-meeple">
                  {identityLabel(access.identity)}
                </Link>
              ) : (
                access.identity && (
                  <form action={switchGrader}>
                    <button type="submit" className="hover:text-meeple">
                      {identityLabel(access.identity)}
                    </button>
                  </form>
                )
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
