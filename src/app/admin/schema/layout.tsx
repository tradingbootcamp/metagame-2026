import type { Metadata } from "next";
import Link from "next/link";
import ViewToggle from "./ViewToggle";

export const metadata: Metadata = {
  title: "Database Schema — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminSchemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/admin/schema"
            className="font-bebas text-xl tracking-wide text-navy"
          >
            Database Schema
          </Link>
          <div className="flex items-center gap-4">
            <ViewToggle />
            <Link
              href="/admin/links"
              className="text-sm text-ink/60 underline underline-offset-2 hover:text-meeple"
            >
              Tracking Links
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
