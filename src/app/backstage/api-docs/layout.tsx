import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "API docs — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="API docs" href="/backstage/api-docs">
      {children}
    </ToolLayout>
  );
}
