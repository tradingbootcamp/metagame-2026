import { describe, expect, it } from "vitest";
import {
  bannerSize,
  FACE_SIZE,
  isBlank,
  noticeHeadline,
  parseNoticeDoc,
  simplifyStroke,
  strokeHit,
  textDoc,
  type Face,
  type StrokeItem,
} from "./notice-doc";

const ok = (raw: unknown, face: Face = "poster") => {
  const r = parseNoticeDoc(raw, face);
  if ("error" in r) throw new Error(r.error);
  return r.doc;
};

describe("parseNoticeDoc", () => {
  it("keeps text and strokes, merging same-weight runs", () => {
    const doc = ok({
      paper: "kraft",
      items: [
        {
          id: "t1",
          kind: "text",
          x: 10,
          y: 20,
          w: 200,
          ink: "red",
          paras: [
            { size: "xl", runs: [{ t: "Board " }, { t: "games" }] },
            { size: "m", bullet: true, runs: [{ t: "Bring", b: true }] },
          ],
        },
        {
          id: "s1",
          kind: "stroke",
          ink: "blue",
          width: 5,
          points: [1, 2, 3, 4],
        },
      ],
    });
    expect(doc.paper).toBe("kraft");
    expect(doc.items[0]).toMatchObject({
      paras: [
        { size: "xl", runs: [{ t: "Board games" }] },
        { size: "m", bullet: true, runs: [{ t: "Bring", b: true }] },
      ],
    });
    expect(doc.items[1]).toMatchObject({ ink: "blue", width: 5 });
  });

  it("clamps positions onto the face and drops empty text boxes", () => {
    const { w, h } = FACE_SIZE.sticky;
    const doc = ok(
      {
        items: [
          {
            kind: "text",
            x: -50,
            y: 9999,
            w: 9999,
            paras: [{ runs: [{ t: "hi" }] }],
          },
          { kind: "text", x: 0, y: 0, w: 50, paras: [{ size: "m", runs: [] }] },
          { kind: "stroke", points: [-5, -5, 9999, 9999] },
        ],
      },
      "sticky",
    );
    expect(doc.items).toHaveLength(2);
    expect(doc.items[0]).toMatchObject({ x: 0, y: h - 10, w });
    expect(doc.items[1]).toMatchObject({ points: [0, 0, w, h] });
    // A sticky's paper is the note colour, not part of the document.
    expect(doc.paper).toBeUndefined();
  });

  it("falls back on unknown sizes, inks and widths rather than refusing", () => {
    const doc = ok({
      items: [
        {
          kind: "text",
          ink: "gold",
          paras: [{ size: "huge", runs: [{ t: "x" }] }],
        },
        { kind: "stroke", ink: "gold", width: 99, points: [1, 1] },
      ],
    });
    expect(doc.items[0]).toMatchObject({ ink: "ink", paras: [{ size: "m" }] });
    expect(doc.items[1]).toMatchObject({ ink: "ink", width: 2 });
  });

  it("refuses shapes it doesn't know and runs that aren't text", () => {
    expect(parseNoticeDoc(null, "poster")).toHaveProperty("error");
    expect(parseNoticeDoc({ items: "no" }, "poster")).toHaveProperty("error");
    expect(
      parseNoticeDoc({ items: [{ kind: "image", src: "x" }] }, "poster"),
    ).toHaveProperty("error");
    expect(
      parseNoticeDoc(
        { items: [{ kind: "text", paras: [{ runs: [{ t: 5 }] }] }] },
        "poster",
      ),
    ).toHaveProperty("error");
  });

  it("caps how much one face can carry", () => {
    const long = { kind: "text", paras: [{ runs: [{ t: "x".repeat(5000) }] }] };
    expect(parseNoticeDoc({ items: [long] }, "poster")).toHaveProperty("error");
    const box = { kind: "text", paras: [{ runs: [{ t: "x" }] }] };
    expect(
      parseNoticeDoc(
        { items: Array.from({ length: 41 }, () => box) },
        "poster",
      ),
    ).toHaveProperty("error");
  });
});

describe("noticeHeadline", () => {
  it("is the sticky's top line, then the poster's, else null", () => {
    const sticky = textDoc("sticky", [{ text: "Werewolf" }, { text: "10pm" }], {
      x: 10,
      y: 60,
    });
    const above = {
      ...sticky,
      items: [
        ...sticky.items,
        ...textDoc("sticky", [{ text: "Tonight!" }], { x: 10, y: 5 }).items,
      ],
    };
    const poster = textDoc("poster", [{ text: "  Big   title " }]);
    expect(noticeHeadline(above, poster)).toBe("Tonight!");
    expect(noticeHeadline({ v: 1, items: [] }, poster)).toBe("Big title");
    expect(noticeHeadline({ v: 1, items: [] }, { v: 1, items: [] })).toBeNull();
    expect(
      noticeHeadline(
        textDoc("sticky", [{ text: "x".repeat(200) }]),
        poster,
        10,
      ),
    ).toBe(`${"x".repeat(9)}…`);
  });
});

describe("isBlank", () => {
  it("counts a stroke or any non-space text as content", () => {
    expect(isBlank({ v: 1, items: [] })).toBe(true);
    expect(isBlank(textDoc("sticky", [{ text: "  " }]))).toBe(true);
    expect(isBlank(textDoc("sticky", [{ text: "a" }]))).toBe(false);
    expect(
      isBlank({
        v: 1,
        items: [
          { id: "s", kind: "stroke", ink: "ink", width: 2, points: [1, 1] },
        ],
      }),
    ).toBe(false);
  });
});

describe("bannerSize", () => {
  it("is the board's width and grows with the session, up to the cap", () => {
    const hour = bannerSize(60);
    const three = bannerSize(180);
    expect(hour.w).toBe(300);
    expect(three.w).toBe(300);
    expect(three.h).toBeGreaterThan(hour.h * 2.5);
    expect(bannerSize(24 * 60).h).toBe(1600);
  });

  it("keeps a session poster's paper, like a poster's", () => {
    const doc = ok({ paper: "kraft", items: [] }, "banner");
    expect(doc.paper).toBe("kraft");
  });
});

describe("simplifyStroke", () => {
  it("drops points on a straight line and keeps the corners", () => {
    const line = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
    expect(simplifyStroke(line)).toEqual([0, 0, 4, 4]);
    const corner = [0, 0, 5, 0, 10, 0, 10, 5, 10, 10];
    expect(simplifyStroke(corner)).toEqual([0, 0, 10, 0, 10, 10]);
  });
});

describe("strokeHit", () => {
  const stroke: StrokeItem = {
    id: "s",
    kind: "stroke",
    ink: "ink",
    width: 2,
    points: [0, 0, 100, 0],
  };
  it("hits near the line and misses away from it", () => {
    expect(strokeHit(stroke, 50, 5, 5)).toBe(true);
    expect(strokeHit(stroke, 50, 20, 5)).toBe(false);
    expect(strokeHit(stroke, 120, 0, 5)).toBe(false);
  });
});
