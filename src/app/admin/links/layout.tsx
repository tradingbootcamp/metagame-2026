import type { Metadata } from "next";
import Link from "next/link";
import BackToTools from "../BackToTools";
import SessionBar from "../SessionBar";

export const metadata: Metadata = {
  title: "Tracking Links — Metagame",
  robots: { index: false, follow: false },
};

export default async function AdminLinksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-4">
            <BackToTools />
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
          </nav>
          <SessionBar />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
