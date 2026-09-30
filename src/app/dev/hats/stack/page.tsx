import { notFound } from "next/navigation";
import StackEditor from "./StackEditor";

export const metadata = { title: "Hat Stack Editor", robots: { index: false } };

// Dev-only tool for placing each hat on top of each other hat, pair by pair.
// Saves straight into src/v2/hat-trick/stacking.json via /api/dev/hats/stack.
// 404s in production builds.
export default function StackEditorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StackEditor />;
}
