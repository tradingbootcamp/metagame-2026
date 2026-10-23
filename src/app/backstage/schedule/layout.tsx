import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Schedule — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Schedule" href="/backstage/schedule">
      {children}
    </ToolLayout>
  );
}
