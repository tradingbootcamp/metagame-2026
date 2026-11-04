"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { QrCode } from "lucide-react";
import {
  DEFAULT_POSTER_QR,
  LOGO_PAD,
  logoClearing,
  qrShapes,
  QR_CORNERS,
  QR_DOTS,
  QR_LOGOS,
  QR_PARAMS,
  type PosterQr,
} from "@/lib/qr-styles";
import { toSvgPath } from "@/lib/vector-path";
import Mg2Die from "@/v2/components/nav/Mg2Die";
import { LogoDie } from "@/v2/components/nav/LogoDice";

/** A sample code's modules, row-major as "0"/"1", for style previews. */
export type QrSampleMatrix = { size: number; bits: string };

const QR_STYLE_KEY = "posters-qr-style";
const QR_KEYS = ["dots", "corners", "logo"] as const;
const QR_CHOICES = { dots: QR_DOTS, corners: QR_CORNERS, logo: QR_LOGOS };
const QR_ROWS = { dots: "Dots", corners: "Corners", logo: "Centre logo" };

const qrText = (qr: PosterQr) => QR_KEYS.map((key) => qr[key]).join(".");
function qrFromText(text: string): PosterQr {
  const parts = text.split(".");
  const qr = { ...DEFAULT_POSTER_QR };
  QR_KEYS.forEach((key, i) => {
    if (Object.hasOwn(QR_CHOICES[key], parts[i] ?? ""))
      (qr as Record<string, string>)[key] = parts[i];
  });
  return qr;
}

// The last choice, remembered per browser as a convenience; the server render
// and hydration always see the default.
let pickedQr: string | null = null;
const qrListeners = new Set<() => void>();
const plainQrText = qrText(DEFAULT_POSTER_QR);

function savedQr(): string {
  if (pickedQr) return pickedQr;
  try {
    return qrText(qrFromText(window.localStorage.getItem(QR_STYLE_KEY) ?? ""));
  } catch {
    return plainQrText;
  }
}

export function useQrStyle() {
  const text = useSyncExternalStore(
    (listener) => {
      qrListeners.add(listener);
      return () => qrListeners.delete(listener);
    },
    savedQr,
    () => plainQrText,
  );
  const qr = useMemo(() => qrFromText(text), [text]);
  function choose(next: PosterQr) {
    pickedQr = qrText(next);
    try {
      window.localStorage.setItem(QR_STYLE_KEY, pickedQr);
    } catch {}
    qrListeners.forEach((listener) => listener());
  }
  return [qr, choose] as const;
}

export function QrSample({
  qr,
  samples,
  className,
}: {
  qr: PosterQr;
  samples: Record<"M" | "H", QrSampleMatrix>;
  className?: string;
}) {
  return (
    <QrArt
      qr={qr}
      matrix={samples[qr.logo === "none" ? "M" : "H"]}
      className={className}
    />
  );
}

/** `matrix` drawn in style `qr`, with the centre logo overlaid as a React component. */
export function QrArt({
  qr,
  matrix: { size, bits },
  className,
  ink = "#000",
  bg = "#fff",
}: {
  qr: PosterQr;
  matrix: QrSampleMatrix;
  className?: string;
  ink?: string;
  bg?: string;
}) {
  const logo = qr.logo === "none" ? null : qr.logo;
  const clear = logo ? logoClearing(size) : 0;
  const d = useMemo(
    () =>
      toSvgPath(
        qrShapes(
          { size, get: (row, col) => bits[row * size + col] === "1" },
          qr,
          clear,
        ),
      ),
    [size, bits, qr, clear],
  );
  const span = size + 2;
  const room = `${((clear - 2 * LOGO_PAD) / span) * 100}%`;
  return (
    <span
      className={`relative block ${className ?? ""}`}
      style={{ backgroundColor: bg }}
    >
      <svg viewBox={`-1 -1 ${span} ${span}`} className="block size-full">
        <path d={d} fill={ink} />
      </svg>
      {logo && (
        <span
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: room, height: room, color: ink }}
        >
          {logo === "mg2" ? (
            <Mg2Die className="size-full" />
          ) : (
            <LogoDie className="size-full" />
          )}
        </span>
      )}
    </span>
  );
}

const ARROW_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

export function QrStylePicker({
  value,
  onChange,
  samples,
}: {
  value: PosterQr;
  onChange: (qr: PosterQr) => void;
  samples: Record<"M" | "H", QrSampleMatrix>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const summary = QR_KEYS.map((key) =>
    key === "logo" && value.logo === "none"
      ? "no logo"
      : `${QR_CHOICES[key][value[key] as never]["label"] as string}`,
  ).join(" · ");
  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          id={`${id}-toggle`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          aria-label="QR code style"
          onClick={() => setOpen(!open)}
          className={`flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            open
              ? "border-[#19345b] bg-[#19345b] text-white"
              : "border-[#19345b]/30 bg-white text-[#19345b] hover:border-[#19345b]/60"
          }`}
        >
          <QrCode aria-hidden className="size-6" />
        </button>
        <p className="min-w-0 text-sm">
          <span className="font-semibold">QR style</span>{" "}
          <span className="text-[#19345b]/70">· {summary}</span>
        </p>
      </div>
      {open && (
        <div
          id={`${id}-panel`}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            setOpen(false);
            document.getElementById(`${id}-toggle`)?.focus();
          }}
          className="mt-3 grid gap-3 rounded-lg border border-[#19345b]/20 bg-white p-3"
        >
          <div className="flex items-center gap-3">
            <QrSample
              qr={value}
              samples={samples}
              className="size-24 shrink-0 rounded border border-[#19345b]/10 p-1"
            />
            <p className="text-xs text-[#19345b]/70">
              Preview of the code at this style. Every option shown here passed
              our scan tests.
            </p>
          </div>
          {QR_KEYS.map((key) => (
            <QrOptionRow
              key={key}
              field={key}
              value={value}
              onChange={onChange}
              samples={samples}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QrOptionRow({
  field,
  value,
  onChange,
  samples,
}: {
  field: (typeof QR_KEYS)[number];
  value: PosterQr;
  onChange: (qr: PosterQr) => void;
  samples: Record<"M" | "H", QrSampleMatrix>;
}) {
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const options = Object.entries(QR_CHOICES[field]).map(([key, { label }]) => {
    const qr = { ...value, [field]: key } as PosterQr;
    return { key, label, qr };
  });
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const at = options.findIndex((option) => option.key === value[field]);
    const next = options[(at + step + options.length) % options.length];
    onChange(next.qr);
    radios.current[options.indexOf(next)]?.focus();
  }
  return (
    <div>
      <p id={`qr-row-${field}`} className="mb-1 text-xs font-semibold">
        {QR_ROWS[field]}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`qr-row-${field}`}
        data-param={QR_PARAMS[field]}
        onKeyDown={onKeyDown}
        className="grid grid-cols-4 gap-1.5"
      >
        {options.map((option, index) => {
          const checked = option.key === value[field];
          return (
            <button
              key={option.key}
              ref={(el) => {
                radios.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(option.qr)}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-md border p-1 text-[11px] leading-tight transition-colors ${
                checked
                  ? "border-[#19345b] bg-[#19345b]/10 font-semibold ring-1 ring-[#19345b]"
                  : "border-transparent hover:bg-[#19345b]/5"
              }`}
            >
              <QrSample qr={option.qr} samples={samples} className="size-11" />
              <span className="w-full text-center">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
