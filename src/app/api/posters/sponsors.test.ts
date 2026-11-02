import { expect, it, vi } from "vitest";
import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";

vi.mock("@/lib/poster-catalog", () => ({
  loadPosterCatalog: async () => [
    {
      value: "area:Berkeley",
      label: "Berkeley",
      placement: "Berkeley",
      available: true,
      slug: "berkeley",
      tracking: null,
    },
  ],
}));
vi.mock("@/lib/tracking-links", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tracking-links")>()),
  findTrackingLink: async () => ({
    slug: "berkeley",
    destination: "https://metagame.games/",
    source: "poster",
    medium: "print",
    campaign: "metagame-2026",
    placement: "Berkeley",
    active: true,
    template: false,
  }),
}));
vi.mock("@/lib/poster-promo", () => ({
  checkPosterPromo: async (code: string) => ({
    ok: true,
    code,
    discount: "$20",
  }),
}));
import { GET } from "./route";

it.each([
  ["d20", "letter", 612, 792, 1736, 336],
  ["d20", "13x19", 936, 1368, 2656, 744],
  ["chess", "letter", 792, 612, 1200, 312],
  ["chess", "13x19", 1368, 936, 1860, 504],
])(
  "includes the approved sponsor footer in %s %s previews and downloads",
  async (design, size, width, height, footerWidth, footerHeight) => {
    for (const preview of [false, true]) {
      const query = new URLSearchParams({
        area: "area:Berkeley",
        design: String(design),
        size: String(size),
        promo: "POSTER20",
        ...(preview ? { preview: "1" } : {}),
      });
      const response = await GET(
        new Request(`http://localhost/api/posters?${query}`),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-disposition")).toContain(
        `${preview ? "inline" : "attachment"};`,
      );
      expect(response.headers.get("content-disposition")).toContain("POSTER20");
      const document = await PDFDocument.load(await response.arrayBuffer());
      expect(document.getPageCount()).toBe(1);
      expect(document.getPages()[0].getSize()).toEqual({ width, height });
      const footerEmbedded = document.context
        .enumerateIndirectObjects()
        .some(([, object]) => {
          if (!(object instanceof PDFRawStream)) return false;
          const dict = object.dict;
          return (
            dict.get(PDFName.of("Subtype")) === PDFName.of("Image") &&
            dict.lookup(PDFName.of("Width"), PDFNumber).asNumber() ===
              footerWidth &&
            dict.lookup(PDFName.of("Height"), PDFNumber).asNumber() ===
              footerHeight
          );
        });
      expect(footerEmbedded).toBe(true);
    }
  },
);
