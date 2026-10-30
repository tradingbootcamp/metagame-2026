import type { Metadata } from "next";
import { loadPosterCatalog } from "@/lib/poster-catalog";
import { GENERIC_AREA } from "@/lib/poster-options";
import { toolAccess } from "@/lib/admin-auth";
import { listStripeCodes, standardProduct } from "@/lib/promo-codes-stripe";
import { posterAccepts } from "@/lib/poster-promo";
import QRCode from "qrcode";
import {
  logoClearing,
  POSTER_QR_STYLE_KEYS,
  posterQrLogo,
  qrShapes,
} from "@/lib/qr-styles";
import { toSvgPath } from "@/lib/vector-path";
import PosterForm, { type PromoChoice, type QrPreview } from "./poster-form";

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

/** Each style drawn on a sample link, by the same geometry the PDF uses. */
function qrPreviews() {
  return Object.fromEntries(
    POSTER_QR_STYLE_KEYS.map((style) => {
      const logo = posterQrLogo(style);
      const { modules } = QRCode.create("https://metagame.games/go/poster", {
        errorCorrectionLevel: logo ? "H" : "M",
      });
      const clear = logo ? logoClearing(modules.size) : 0;
      const preview: QrPreview = {
        d: toSvgPath(qrShapes(modules, style, clear)),
        size: modules.size,
        clear,
      };
      return [style, preview];
    }),
  ) as Record<(typeof POSTER_QR_STYLE_KEYS)[number], QrPreview>;
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
            qrPreviews={qrPreviews()}
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
