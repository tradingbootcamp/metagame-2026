import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import type { Quest } from "./megagame-store";
import { createQuestPdf, prepareQuestImage } from "./quest-pdf";

const quest = (over: Partial<Quest> = {}): Quest => ({
  id: "00000000-0000-4000-8000-000000000001",
  code: "A2C4EF",
  title: "The Lighthouse Keeper’s Ledger",
  bodyText: "Find the keeper.\nAsk about the ledger.",
  bodyImages: [],
  class: "wizard",
  minLevel: 2,
  maxLevel: 4,
  minPlayers: 3,
  stampsWizard: 2,
  stampsPirate: 0,
  stampsAlien: 0,
  stampsAny: 1,
  evidence: null,
  evidenceImage: null,
  hint: null,
  author: "Brian",
  active: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
});

describe("quest PDF", () => {
  it("draws one US Letter page per quest", async () => {
    const { bytes, overflow } = await createQuestPdf(
      [quest(), quest({ code: "B3D5GH", class: null, author: null })],
      new Map(),
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    expect(overflow).toEqual([]);
  });

  it("shrinks long text to fit and reports text that cannot", async () => {
    const sentence = "The keeper hides a ledger beneath the lamp room floor. ";
    const long = await createQuestPdf(
      [quest({ bodyText: sentence.repeat(20) })],
      new Map(),
    );
    expect(long.overflow).toEqual([]);
    const tooLong = await createQuestPdf(
      [quest({ bodyText: sentence.repeat(200) })],
      new Map(),
    );
    expect(tooLong.overflow).toEqual(["A2C-4EF"]);
    expect((await PDFDocument.load(tooLong.bytes)).getPageCount()).toBe(1);
  });

  it("reports characters the fonts cannot draw", async () => {
    const { overflow } = await createQuestPdf(
      [quest({ title: "★ Pirate Hunt 🏴‍☠️" })],
      new Map(),
    );
    expect(overflow).toEqual(["A2C-4EF"]);
  });

  it("shrinks pictures, keeping transparency only where it is used", async () => {
    const make = (alpha: number) =>
      sharp({
        create: {
          width: 1600,
          height: 1200,
          channels: 4,
          background: { r: 200, g: 40, b: 40, alpha },
        },
      })
        .png()
        .toBuffer();
    const opaque = await prepareQuestImage(await make(1));
    const clear = await prepareQuestImage(await make(0.5));
    expect(opaque.kind).toBe("jpeg");
    expect(clear.kind).toBe("png");
    expect((await sharp(opaque.data).metadata()).width).toBe(1200);

    const url = "https://example.test/picture.png";
    const { bytes, overflow } = await createQuestPdf(
      [quest({ bodyImages: [url] })],
      new Map([[url, clear]]),
    );
    expect(overflow).toEqual([]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
