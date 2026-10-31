import type { Metadata } from "next";
import { loadPosterCatalog } from "@/lib/poster-catalog";
import { GENERIC_AREA } from "@/lib/poster-options";
import { toolAccess } from "@/lib/admin-auth";
import { listStripeCodes, standardProduct } from "@/lib/promo-codes-stripe";
import { posterAccepts } from "@/lib/poster-promo";
import QRCode from "qrcode";
import PosterForm, {
  type PromoChoice,
  type QrSampleMatrix,
} from "./poster-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Posters | Metagame",
  robots: { index: false, follow: false },
};

/** Live codes from /backstage/promo that posters accept, for staff; empty for everyone else. */
async function promoChoices(): Promise<PromoChoice[]> {
  if (!(await toolAccess("promo.view"))) return [];
  try {
    const [codes, standard] = await Promise.all([
      listStripeCodes(),
      standardProduct(),
    ]);
    return codes
      .filter(
        (c) =>
          c.active &&
          (c.max == null || c.redeemed < c.max) &&
          c.discount &&
          posterAccepts(c.discount, standard),
      )
      .map((c) => ({ code: c.code, label: c.coupon }))
      .sort((a, b) => a.code.localeCompare(b.code));
  } catch {
    return [];
  }
}

/** A sample link's modules at levels M and H, for the QR style previews. */
function qrSamples(): Record<"M" | "H", QrSampleMatrix> {
  const sample = (level: "M" | "H") => {
    const { modules } = QRCode.create("https://metagame.games/go/poster", {
      errorCorrectionLevel: level,
    });
    return { size: modules.size, bits: Array.from(modules.data).join("") };
  };
  return { M: sample("M"), H: sample("H") };
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
    <div className="px-6 pt-28 pb-16 text-[#19345b]">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 text-4xl font-bold">Posters</h1>
        {options ? (
          <PosterForm
            options={options}
            initialArea={GENERIC_AREA}
            promos={promos}
            qrSamples={qrSamples()}
          />
        ) : (
          <p role="alert" className="rounded-xl border border-current p-6">
            The poster options are temporarily unavailable. Please try again
            shortly.
          </p>
        )}
      </div>
    </div>
  );
}
