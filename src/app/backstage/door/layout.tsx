import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Door — Metagame",
  robots: { index: false, follow: false },
};

export default function DoorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Door" href="/backstage/door">
      {children}
    </ToolLayout>
  );
}
