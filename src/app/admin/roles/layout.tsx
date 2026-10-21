import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Roles — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminRolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Roles" href="/admin/roles">
      {children}
    </ToolLayout>
  );
}
