import { loadPosterCatalog } from "@/lib/poster-catalog";
import { isPosterLink } from "@/lib/poster-options";
import { findTrackingLink } from "@/lib/tracking-links";
import { createPosterPdf } from "@/lib/poster-pdf";

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
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="metagame-${design}-${choice.slug}-${size}.pdf"`,
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
