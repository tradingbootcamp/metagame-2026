import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Backstage — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminIndexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Team Tools" href="/backstage">
      {children}
    </ToolLayout>
  );
}
