import type { Metadata } from "next";
import ToolLayout from "../ToolLayout";

export const metadata: Metadata = {
  title: "Budget — Metagame",
  robots: { index: false, follow: false },
};

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToolLayout title="Budget" href="/backstage/budget" wide>
      {children}
    </ToolLayout>
  );
}
