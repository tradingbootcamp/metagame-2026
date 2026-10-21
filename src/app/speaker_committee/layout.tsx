import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "./actions";
import { accountLabel, adminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Speaker Committee — Metagame",
  robots: { index: false, follow: false },
};

export default async function SpeakerCommitteeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await adminSession();
  const label = account ? await accountLabel(account.user) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/speaker_committee"
            className="font-bebas text-xl tracking-wide text-navy"
          >
            Speaker Committee
          </Link>
          {label && (
            <div className="flex items-center gap-3 text-sm text-ink/60">
              <Link href="/account" className="hover:text-meeple">
                {label}
              </Link>
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
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
