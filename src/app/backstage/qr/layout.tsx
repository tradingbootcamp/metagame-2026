import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "QR codes — Metagame",
  robots: { index: false, follow: false },
};

export default function QrLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToolLayout title="QR codes" href="/backstage/qr">
      {children}
    </ToolLayout>
  );
}
