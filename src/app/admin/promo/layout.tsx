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
      href="/admin/promo"
      nav={
        <Link
          href="/admin/links"
          className="text-sm text-ink/60 underline-offset-2 hover:text-meeple hover:underline"
        >
          Tracking links
        </Link>
      }
    >
      {children}
    </ToolLayout>
  );
}
