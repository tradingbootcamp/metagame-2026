import { loadPosterCatalog } from "@/lib/poster-catalog";
import { isPosterLink } from "@/lib/poster-options";
import { findTrackingLink, findUniqueTrackingLink } from "@/lib/tracking-links";
import { createPosterPdf } from "@/lib/poster-pdf";
import { revalidatePath } from "next/cache";
import { posterDiscountAccess } from "@/lib/poster-discount-access";
import { resolveStripePosterDiscount } from "@/lib/stripe-poster-discounts";
import { resolveBtcPosterDiscount } from "@/lib/discount-codes";
import { ensurePosterDiscountLink } from "@/lib/poster-discount-links";
import type { PosterDiscounts } from "@/lib/poster-discount-params";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (
    ["stripe", "btc", "poster_promo", "poster_btc"].some((key) =>
      params.has(key),
    )
  ) {
    return Response.json(
      { error: "Discounted posters require staff preparation." },
      { status: 400, headers },
    );
  }
  return renderPoster(params);
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json(
      { error: "Invalid request origin." },
      { status: 403, headers },
    );
  }
  const access = await posterDiscountAccess();
  if (!access)
    return Response.json(
      { error: "Staff access to promo codes and tracking links is required." },
      { status: 403, headers },
    );
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
  } catch {
    return Response.json(
      { error: "Invalid poster request." },
      { status: 400, headers },
    );
  }
  const stripe = body.stripe ?? "";
  const btc = body.btc ?? "";
  if (
    typeof stripe !== "string" ||
    typeof btc !== "string" ||
    !/^[a-z0-9_-]{0,100}$/i.test(stripe) ||
    !/^[a-z0-9_-]{0,100}$/i.test(btc) ||
    (!stripe && !btc)
  )
    return Response.json(
      { error: "Choose an existing discount." },
      { status: 400, headers },
    );
  const params = new URLSearchParams();
  for (const key of ["area", "design", "size", "preview"]) {
    if (typeof body[key] === "string") params.set(key, body[key]);
  }
  return renderPoster(params, { stripe, btc }, access.name);
}

async function renderPoster(
  params: URLSearchParams,
  discounts?: PosterDiscounts,
  createdBy?: string,
) {
  const area = params.get("area");
  const design = params.get("design");
  const size = params.get("size");
  const disposition = params.get("preview") === "1" ? "inline" : "attachment";
  if (
    !area ||
    area.length > 200 ||
    !["d20", "chess"].includes(design ?? "") ||
    !["letter", "13x19"].includes(size ?? "")
  ) {
    return Response.json(
      { error: "Choose an area, design, and paper size." },
      { status: 400, headers },
    );
  }
  try {
    const choice = (await loadPosterCatalog()).find(
      (option) => option.value === area,
    );
    if (!choice?.available || !choice.slug)
      return Response.json(
        { error: "Poster link unavailable." },
        { status: 409, headers },
      );
    const link = discounts
      ? await findUniqueTrackingLink(choice.slug)
      : await findTrackingLink(choice.slug);
    if (!link || !isPosterLink(link, choice.placement)) {
      return Response.json(
        { error: "Poster link unavailable." },
        { status: 409, headers },
      );
    }
    let slug = choice.slug;
    if (discounts) {
      const [stripe, btc] = await Promise.all([
        discounts.stripe ? resolveStripePosterDiscount(discounts.stripe) : null,
        discounts.btc ? resolveBtcPosterDiscount(discounts.btc) : null,
      ]);
      if ((discounts.stripe && !stripe) || (discounts.btc && !btc)) {
        return Response.json(
          {
            error:
              "A selected discount is no longer available. Reload the poster page and choose another code.",
          },
          { status: 409, headers },
        );
      }
      slug = (
        await ensurePosterDiscountLink(
          link,
          { stripe: stripe?.code ?? "", btc: btc?.code ?? "" },
          createdBy!,
        )
      ).slug;
      revalidatePath("/backstage/links");
    }
    const pdf = await createPosterPdf(
      design as "d20" | "chess",
      size as "letter" | "13x19",
      slug,
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="metagame-${design}-${slug}-${size}.pdf"`,
        "X-Poster-Slug": slug,
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
