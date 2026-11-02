import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Sent Emails — Metagame",
  robots: { index: false, follow: false },
};

export default function BackstageEmailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Sent Emails" href="/backstage/emails">
      {children}
    </ToolLayout>
  );
}
