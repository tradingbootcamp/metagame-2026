import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "API keys — Metagame",
  robots: { index: false, follow: false },
};

export default function AdminApiKeysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="API keys" href="/backstage/api-keys">
      {children}
    </ToolLayout>
  );
}
