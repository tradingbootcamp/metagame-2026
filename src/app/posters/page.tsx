import type { Metadata } from "next";
import { loadPosterCatalog } from "@/lib/poster-catalog";
import { GENERIC_AREA } from "@/lib/poster-options";
import { toolAccess } from "@/lib/admin-auth";
import { listStripeCodes } from "@/lib/promo-codes-stripe";
import PosterForm, { type PromoChoice } from "./poster-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Posters | Metagame",
  robots: { index: false, follow: false },
};

/** Live codes from /backstage/promo, for staff who may hand them out; null for everyone else. */
async function promoChoices(): Promise<PromoChoice[] | null> {
  if (!(await toolAccess("promo.manage"))) return null;
  try {
    return (await listStripeCodes())
      .filter((c) => c.active && (c.max == null || c.redeemed < c.max))
      .map((c) => ({ code: c.code, label: c.coupon }))
      .sort((a, b) => a.code.localeCompare(b.code));
  } catch {
    return [];
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
