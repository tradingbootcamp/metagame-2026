import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Magnum Opus — Metagame",
  robots: { index: false, follow: false },
};

export default function MagnumOpusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Magnum Opus" href="/backstage/magnum-opus">
      {children}
    </ToolLayout>
  );
}
