import type { Metadata } from "next";
import Link from "next/link";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Megagame — Metagame",
  robots: { index: false, follow: false },
};

export default function MegagameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout
      title="Megagame"
      href="/backstage/megagame"
      nav={
        <Link
          href="/backstage/megagame/level"
          className="text-sm whitespace-nowrap text-ink/60 underline-offset-2 hover:text-meeple hover:underline"
        >
          Level up
        </Link>
      }
    >
      <div className="mx-auto flex max-w-xl flex-col gap-8">{children}</div>
    </ToolLayout>
  );
}
