import type { Metadata } from "next";
import { loadPosterCatalog } from "@/lib/poster-catalog";
import { GENERIC_AREA } from "@/lib/poster-options";
import { posterDiscounts } from "@/lib/poster-discounts";
import PosterForm, { type PromoChoice } from "./poster-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Posters | Metagame",
  robots: { index: false, follow: false },
};

async function promoChoices(): Promise<PromoChoice[] | null> {
  try {
    return await posterDiscounts();
  } catch {
    return null;
  }
}

export default async function PostersPage() {
  const promos = await promoChoices();
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
        {options ? (
          <PosterForm
            options={options}
            initialArea={GENERIC_AREA}
            promos={promos}
          />
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
