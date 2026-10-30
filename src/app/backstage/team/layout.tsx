import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Team — Metagame",
  robots: { index: false, follow: false },
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Team" href="/backstage/team" wide>
      {children}
    </ToolLayout>
  );
}
