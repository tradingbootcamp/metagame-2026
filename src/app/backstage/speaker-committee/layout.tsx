import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";
import { schedulePaneOn } from "./pane";

export const metadata: Metadata = {
  title: "Speaker Committee — Metagame",
  robots: { index: false, follow: false },
};

export default async function SpeakerCommitteeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout
      title="Speaker Committee"
      href="/backstage/speaker-committee"
      wide
      fluid={await schedulePaneOn()}
    >
      {children}
    </ToolLayout>
  );
}
