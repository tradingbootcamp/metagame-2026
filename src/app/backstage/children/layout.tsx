import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Children — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminChildrenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Children" href="/backstage/children" wide>
      {children}
    </ToolLayout>
  );
}
