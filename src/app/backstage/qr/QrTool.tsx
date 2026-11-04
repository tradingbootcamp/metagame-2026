"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { buttonClass, fieldClass, smallButtonClass } from "@/app/backstage/ui";
import {
  QrArt,
  QrStylePicker,
  useQrStyle,
  type QrSampleMatrix,
} from "@/components/QrStylePicker";
import {
  DEFAULT_QR_COLORS,
  hexColor,
  MAX_QR_TEXT,
  posterQrQuery,
} from "@/lib/qr-styles";

const PNG_SIZE = 2048;

/** Style previews use a sample link so they look alike whatever's typed. */
function sample(level: "M" | "H"): QrSampleMatrix {
  const { modules } = QRCode.create("https://metagame.games", {
    errorCorrectionLevel: level,
  });
  return { size: modules.size, bits: Array.from(modules.data).join("") };
}

export default function QrTool() {
  const [text, setText] = useState("");
  const [qr, setQr] = useQrStyle();
  const [colors, setColors] = useState(DEFAULT_QR_COLORS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const samples = useMemo(() => ({ M: sample("M"), H: sample("H") }), []);
  const trimmed = text.trim();
  const matrix = useMemo<QrSampleMatrix | null>(() => {
    if (!trimmed || trimmed.length > MAX_QR_TEXT) return null;
    try {
      const { modules } = QRCode.create(trimmed, {
        errorCorrectionLevel: qr.logo === "none" ? "M" : "H",
      });
      return { size: modules.size, bits: Array.from(modules.data).join("") };
    } catch {
      return null;
    }
  }, [trimmed, qr.logo]);
  const query = new URLSearchParams({
    text: trimmed,
    ...posterQrQuery(qr),
    ...(colors.ink !== DEFAULT_QR_COLORS.ink ? { ink: colors.ink } : {}),
    ...(colors.bg !== DEFAULT_QR_COLORS.bg ? { bg: colors.bg } : {}),
  }).toString();

  async function save(format: "svg" | "png") {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/qr?${query}`);
      if (!response.ok) throw new Error("Couldn’t make that QR code.");
      const svg = await response.blob();
      const blob = format === "svg" ? svg : await rasterize(svg);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `metagame-qr.${format}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 rounded-2xl border border-line bg-white p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {matrix ? (
          <QrArt
            qr={qr}
            matrix={matrix}
            ink={colors.ink}
            bg={colors.bg}
            className="mx-auto aspect-square w-full max-w-md rounded-lg border border-line p-4"
          />
        ) : (
          <p
            role="status"
            className="mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink/60"
          >
            {trimmed
              ? "That text is too long for a QR code."
              : "Type a link or any text to see its QR code."}
          </p>
        )}
      </div>
      <div className="space-y-6">
        <label className="block">
          <span className="font-semibold">Text</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            maxLength={MAX_QR_TEXT}
            placeholder="https://metagame.games/…"
            className={`${fieldClass} mt-2 font-mono text-sm`}
          />
        </label>
        <QrStylePicker value={qr} onChange={setQr} samples={samples} />
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label="Code"
            value={colors.ink}
            onChange={(ink) => setColors({ ...colors, ink })}
          />
          <ColorField
            label="Background"
            value={colors.bg}
            onChange={(bg) => setColors({ ...colors, bg })}
          />
        </div>
        <div className="space-y-2">
          <button
            type="button"
            disabled={!matrix || busy}
            onClick={() => save("png")}
            className={buttonClass}
          >
            Download PNG
          </button>
          <button
            type="button"
            disabled={!matrix || busy}
            onClick={() => save("svg")}
            className={`${smallButtonClass} w-full py-2`}
          >
            Download SVG
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** The SVG painted onto a square canvas; it's pure vectors, so this is lossless. */
async function rasterize(svg: Blob): Promise<Blob> {
  const url = URL.createObjectURL(svg);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Couldn’t render the PNG."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PNG_SIZE;
    canvas.getContext("2d")!.drawImage(image, 0, 0, PNG_SIZE, PNG_SIZE);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Couldn’t render the PNG.")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A swatch picker beside a hex box; the hex only applies once it's a full #rrggbb. */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [typed, setTyped] = useState(value);
  const [editing, setEditing] = useState(false);
  const shown = editing ? typed : value;
  return (
    <label className="block">
      <span className="text-xs font-semibold">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded border border-line bg-white p-0.5"
        />
        <input
          type="text"
          value={shown}
          spellCheck={false}
          onFocus={() => {
            setTyped(value);
            setEditing(true);
          }}
          onBlur={() => setEditing(false)}
          onChange={(event) => {
            setTyped(event.target.value);
            const hex = hexColor(event.target.value);
            if (hex) onChange(hex);
          }}
          className={`${fieldClass} min-w-0 px-2 py-1.5 font-mono text-sm`}
        />
      </span>
    </label>
  );
}
