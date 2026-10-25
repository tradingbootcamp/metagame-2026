import type { Metadata } from "next";
import Link from "next/link";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Promo Codes — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminPromoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout
      title="Promo Codes"
      href="/backstage/promo"
      nav={
        <Link
          href="/backstage/links"
          className="hidden text-sm whitespace-nowrap text-ink/60 underline-offset-2 hover:text-meeple hover:underline sm:inline"
        >
          Tracking links
        </Link>
      }
    >
      {children}
    </ToolLayout>
  );
}
