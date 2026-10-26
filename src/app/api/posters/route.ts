import { loadPosterCatalog } from "@/lib/poster-catalog";
import { isPosterLink } from "@/lib/poster-options";
import { findTrackingLink, PROMO_PARAM, promoCode } from "@/lib/tracking-links";
import { createPosterPdf } from "@/lib/poster-pdf";
import { posterDiscounts } from "@/lib/poster-discounts";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const area = params.get("area");
  const design = params.get("design");
  const size = params.get("size");
  const disposition = params.get("preview") === "1" ? "inline" : "attachment";
  const promoRaw = params.get(PROMO_PARAM) ?? "";
  const promo = promoCode(promoRaw);
  if (
    !area ||
    area.length > 200 ||
    !["d20", "chess"].includes(design ?? "") ||
    !["letter", "13x19"].includes(size ?? "") ||
    promo !== promoRaw.trim()
  ) {
    return Response.json(
      { error: "Choose an area, design, and paper size." },
      { status: 400, headers },
    );
  }
  try {
    if (promo) {
      const discounts = await posterDiscounts();
      if (discounts === null)
        return Response.json(
          { error: "Discount access required." },
          { status: 403, headers },
        );
      if (!discounts.some((choice) => choice.code === promo))
        return Response.json(
          {
            error:
              "Discount unavailable. Refresh the page and choose another code or None.",
          },
          { status: 409, headers },
        );
    }
    const choice = (await loadPosterCatalog()).find(
      (option) => option.value === area,
    );
    if (!choice?.available || !choice.slug)
      return Response.json(
        { error: "Poster link unavailable." },
        { status: 409, headers },
      );
    const link = await findTrackingLink(choice.slug);
    if (!link || !isPosterLink(link, choice.placement)) {
      return Response.json(
        { error: "Poster link unavailable." },
        { status: 409, headers },
      );
    }
    const pdf = await createPosterPdf(
      design as "d20" | "chess",
      size as "letter" | "13x19",
      choice.slug,
      promo,
    );
    const name = [design, choice.slug, promo, size].filter(Boolean).join("-");
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="metagame-${name}.pdf"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "Posters are temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
