import { notFound } from "next/navigation";
import HatEditor from "./HatEditor";

export const metadata = { title: "Hat Editor", robots: { index: false } };

// Dev-only tool for tracing Hat Trick's hat outlines and placing them on the
// "You?" silhouette. Saves straight into src/v2/hat-trick/hats.ts via
// /api/dev/hats. 404s in production builds.
export default function HatEditorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <HatEditor />;
}
