import type { Metadata } from "next";
import Link from "next/link";
import { loadPosterCatalog } from "@/lib/poster-catalog";
import { GENERIC_AREA } from "@/lib/poster-options";
import PosterForm from "./poster-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Posters | Metagame",
  robots: { index: false, follow: false },
};

export default async function PostersPage() {
  let options;
  try {
    options = (await loadPosterCatalog()).map(
      ({ value, label, available, tracking }) => ({
        value,
        label,
        available,
        tracking,
      }),
    );
  } catch {
    options = null;
  }
  return (
    <main className="min-h-screen bg-[#fffaf0] px-6 py-16 text-[#19345b]">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 text-4xl font-bold">Posters</h1>
        <p className="mb-6 text-sm">
          <Link href="/backstage/links?view=posters" className="underline">
            View poster tracking links (staff sign-in required)
          </Link>
        </p>
        {options ? (
          <PosterForm options={options} initialArea={GENERIC_AREA} />
        ) : (
          <p role="alert" className="rounded-xl border border-current p-6">
            The poster options are temporarily unavailable. Please try again
            shortly.
          </p>
        )}
      </div>
    </main>
  );
}
