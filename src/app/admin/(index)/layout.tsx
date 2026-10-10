import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Team Tools — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminIndexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Team Tools" href="/admin">
      {children}
    </ToolLayout>
  );
}
