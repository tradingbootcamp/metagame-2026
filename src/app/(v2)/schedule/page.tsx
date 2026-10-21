import type { Metadata } from "next";
import { prelaunchGate } from "./data";

export const metadata: Metadata = {
  title: "Schedule — Metagame 2026",
  robots: { index: false },
};

export default async function SchedulePage() {
  await prelaunchGate();
  return null;
}
