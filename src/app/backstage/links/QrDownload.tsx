"use client";

import { useEffect, useRef, useState } from "react";
import type { Options } from "qr-code-styling";
import { cn } from "@/lib/utils";
import { selectClass, selectStyle } from "../ui";

const SIZES = [
  { px: 512, label: "512 px" },
  { px: 1024, label: "1024 px" },
  { px: 2048, label: "2048 px (print)" },
] as const;

const STYLES = {
  square: { label: "Square", dots: "square", eye: "square", eyeDot: "square" },
  dots: { label: "Dots", dots: "dots", eye: "extra-rounded", eyeDot: "dot" },
  rounded: {
    label: "Rounded",
    dots: "rounded",
    eye: "extra-rounded",
    eyeDot: "square",
  },
  blobby: {
    label: "Blobby",
    dots: "extra-rounded",
    eye: "extra-rounded",
    eyeDot: "dot",
  },
  classy: {
    label: "Classy",
    dots: "classy-rounded",
    eye: "extra-rounded",
    eyeDot: "dot",
  },
  logo: {
    label: "Logo",
    dots: "dots",
    eye: "extra-rounded",
    eyeDot: "dot",
    image: "/images/logo_square.png",
  },
} as const satisfies Record<
  string,
  {
    label: string;
    dots: NonNullable<Options["dotsOptions"]>["type"];
    eye: NonNullable<Options["cornersSquareOptions"]>["type"];
    eyeDot: NonNullable<Options["cornersDotOptions"]>["type"];
    image?: string;
  }
>;
type Style = keyof typeof STYLES;

const NAVY = "#173059";

const qrOptions = (url: string, style: Style, size: number): Options => {
  const s = STYLES[style];
  const image = "image" in s ? s.image : undefined;
  return {
    width: size,
    height: size,
    type: "canvas",
    data: url,
    // Quiet zone and logo padding scale with the export size.
    margin: Math.round(size / 40),
    image,
    imageOptions: {
      margin: Math.round(size / 64),
      imageSize: 0.35,
      crossOrigin: "anonymous",
    },
    qrOptions: { errorCorrectionLevel: image ? "H" : "M" },
    dotsOptions: { type: s.dots, color: NAVY },
    cornersSquareOptions: { type: s.eye, color: NAVY },
    cornersDotOptions: { type: s.eyeDot, color: NAVY },
    backgroundOptions: { color: "#ffffff" },
  };
};

const loadLib = () => import("qr-code-styling").then((m) => m.default);

export function useQr(url: string, slug: string) {
  const [size, setSize] = useState<number>(1024);
  const [style, setStyle] = useState<Style>("square");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const QRCodeStyling = await loadLib();
      await new QRCodeStyling(qrOptions(url, style, size)).download({
        name: `go-${slug}-${style}`,
        extension: "png",
      });
    } finally {
      setBusy(false);
    }
  };

  return { url, size, setSize, style, setStyle, busy, download };
}
type Qr = ReturnType<typeof useQr>;

export function QrPreview({
  url,
  style,
  px,
  className,
}: {
  url: string;
  style: Style;
  px: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    void loadLib().then((QRCodeStyling) => {
      const el = ref.current;
      if (cancelled || !el) return;
      el.replaceChildren();
      new QRCodeStyling(qrOptions(url, style, px * 2)).append(el);
    });
    return () => {
      cancelled = true;
    };
  }, [url, style, px]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`QR code for ${url}`}
      style={{ width: px, height: px }}
      className={cn(
        "shrink-0 rounded-lg border border-line bg-white p-1.5 [&>canvas]:h-full [&>canvas]:w-full",
        className,
      )}
    />
  );
}

export const solidSmallButtonClass =
  "rounded-md bg-meeple px-2.5 py-1 text-sm font-semibold text-white transition-colors hover:bg-meeple-dark disabled:opacity-60";
const smallSelectClass = cn(selectClass, "rounded-md py-1 text-sm");

export function QrControls({ qr, label }: { qr: Qr; label: string }) {
  return (
    <>
      <button
        type="button"
        onClick={() => void qr.download()}
        disabled={qr.busy}
        className={solidSmallButtonClass}
      >
        {qr.busy ? "Rendering…" : label}
      </button>
      <select
        aria-label="QR size"
        value={qr.size}
        onChange={(e) => qr.setSize(Number(e.target.value))}
        className={smallSelectClass}
        style={selectStyle}
      >
        {SIZES.map((s) => (
          <option key={s.px} value={s.px}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        aria-label="QR style"
        value={qr.style}
        onChange={(e) => qr.setStyle(e.target.value as Style)}
        className={smallSelectClass}
        style={selectStyle}
      >
        {(Object.keys(STYLES) as Style[]).map((k) => (
          <option key={k} value={k}>
            {STYLES[k].label}
          </option>
        ))}
      </select>
    </>
  );
}

export default function QrDownload({
  url,
  slug,
}: {
  url: string;
  slug: string;
}) {
  const qr = useQr(url, slug);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <QrPreview url={url} style={qr.style} px={96} />
      <div className="flex flex-wrap items-center gap-2">
        <QrControls qr={qr} label="Download PNG" />
      </div>
    </div>
  );
}
