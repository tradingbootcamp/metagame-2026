import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Speaker Committee — Metagame",
  robots: { index: false, follow: false },
};

export default function SpeakerCommitteeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Speaker Committee" href="/backstage/speaker-committee">
      {children}
    </ToolLayout>
  );
}
