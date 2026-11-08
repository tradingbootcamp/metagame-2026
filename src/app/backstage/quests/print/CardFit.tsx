"use client";

import { useEffect, useState } from "react";
import { OVERFLOW_HEADER } from "./overflow";

const TITLE_PT = { max: 44, min: 18, step: 2 };
const BODY_PT = { min: 9, step: 0.5 };

const fits = (box: HTMLElement) =>
  box.scrollHeight <= box.clientHeight + 1 &&
  box.scrollWidth <= box.clientWidth + 1;

function shrink(
  box: HTMLElement,
  text: HTMLElement,
  maxPt: number,
  minPt: number,
  step: number,
) {
  for (let pt = maxPt; pt >= minPt; pt -= step) {
    text.style.fontSize = `${pt}pt`;
    if (fits(box)) return true;
  }
  return false;
}

/** Shrinks each card's title and body until they fit; returns the codes that still overflow. */
export function fitCards(root: ParentNode): string[] {
  const overflow: string[] = [];
  root.querySelectorAll<HTMLElement>("[data-card]").forEach((card) => {
    const title = card.querySelector<HTMLElement>("[data-title]");
    if (title) shrink(title, title, TITLE_PT.max, TITLE_PT.min, TITLE_PT.step);
    const body = card.querySelector<HTMLElement>("[data-body]");
    const text = card.querySelector<HTMLElement>("[data-body-text]");
    if (!body || !text) return;
    // Cards with pictures start smaller so the pictures get more of the page.
    const maxPt = card.querySelector("[data-images]") ? 13 : 18;
    if (!shrink(body, text, maxPt, BODY_PT.min, BODY_PT.step)) {
      card.dataset.overflow = "1";
      overflow.push(card.dataset.card ?? "?");
    }
  });
  return overflow;
}

function overflowMessage(codes: string[]) {
  return `Text doesn\u2019t fit on ${codes.join(", ")} even at 9pt; shorten it.`;
}

/**
 * Runs the fit once fonts and pictures have loaded, flags the document for the
 * PDF route, then offers the download. Lists the cards whose text could not be
 * made to fit.
 */
export default function CardFit({ count }: { count: number }) {
  const [fit, setFit] = useState<{ done: boolean; overflow: string[] }>({
    done: false,
    overflow: [],
  });
  const [download, setDownload] = useState<{ busy: boolean; error: string }>({
    busy: false,
    error: "",
  });
  useEffect(() => {
    let cancelled = false;
    const images = [...document.images].filter((img) => !img.complete);
    Promise.all([
      document.fonts.ready,
      ...images.map(
        (img) =>
          new Promise((done) => {
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          }),
      ),
    ]).then(() => {
      if (cancelled) return;
      const overflow = fitCards(document);
      setFit({ done: true, overflow });
      document.documentElement.dataset.fitDone = overflow.join(",") || "ok";
    });
    return () => {
      cancelled = true;
      delete document.documentElement.dataset.fitDone;
    };
  }, [count]);

  async function downloadPdf() {
    setDownload({ busy: true, error: "" });
    try {
      const res = await fetch(
        `/backstage/quests/print/pdf${window.location.search}`,
      );
      if (!res.ok) throw new Error(await res.text());
      const name =
        res.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "quests.pdf";
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: name,
      });
      a.click();
      URL.revokeObjectURL(url);
      const overflow = res.headers.get(OVERFLOW_HEADER);
      setDownload({
        busy: false,
        error: overflow
          ? `In the PDF: ${overflowMessage(overflow.split(","))}`
          : "",
      });
    } catch (e) {
      setDownload({
        busy: false,
        error: e instanceof Error && e.message ? e.message : "Download failed.",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={!fit.done || download.busy}
        className="rounded-md bg-navy px-3 py-1.5 font-semibold text-white disabled:opacity-50"
      >
        {!fit.done
          ? "Laying out\u2026"
          : download.busy
            ? "Generating\u2026"
            : "Download PDF"}
      </button>
      <span>
        {count} card{count === 1 ? "" : "s"}, one per US Letter page.
      </span>
      {fit.overflow.length > 0 && (
        <span role="alert" className="font-semibold text-[#c0392b]">
          {overflowMessage(fit.overflow)}
        </span>
      )}
      {download.error && (
        <span role="alert" className="font-semibold text-[#c0392b]">
          {download.error}
        </span>
      )}
    </>
  );
}
