import type { Metadata } from "next";
import Link from "next/link";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Tracking Links — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminLinksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout
      title="Tracking Links"
      href="/backstage/links"
      nav={
        <Link
          href="/backstage/promo"
          className="hidden text-sm whitespace-nowrap text-ink/60 underline-offset-2 hover:text-meeple hover:underline sm:inline"
        >
          Promo codes
        </Link>
      }
    >
      {children}
    </ToolLayout>
  );
}
