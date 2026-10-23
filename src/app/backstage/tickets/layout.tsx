import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Tickets — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminTicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Tickets" href="/backstage/tickets">
      {children}
    </ToolLayout>
  );
}
