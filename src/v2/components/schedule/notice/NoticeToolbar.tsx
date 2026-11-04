"use client";

import {
  BoldIcon,
  EraserIcon,
  ListIcon,
  PenLineIcon,
  TypeIcon,
  Undo2Icon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  INK_HEX,
  INKS,
  PAPER_HEX,
  PAPERS,
  PEN_WIDTHS,
  TEXT_SIZES,
  type Face,
  type Ink,
  type Paper,
  type PenWidth,
  type TextSize,
} from "@/lib/notice-doc";
import { NOTE_COLORS, type NoteColor } from "@/lib/unconference";
import { NOTE_STYLES } from "@/v2/lib/schedule-styles";
import type { Tool } from "./NoticeCanvas";
import {
  selectionFormat,
  setBlockSize,
  toggleBold,
  toggleBullet,
} from "./rich-text";

const SIZE_LABEL: Record<TextSize, string> = {
  s: "S",
  m: "M",
  l: "L",
  xl: "XL",
};

// Pressing a toolbar button must not take focus (and the selection) out of
// the text box it is formatting.
const keep = (e: React.SyntheticEvent) => e.preventDefault();

function Btn({
  on,
  label,
  onClick,
  disabled,
  children,
}: {
  on?: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onMouseDown={keep}
      onPointerDown={keep}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-bold transition-colors disabled:opacity-35 ${
        on
          ? "bg-[#1b1530] text-cream"
          : "text-[#1b1530] enabled:hover:bg-[#1b1530]/10"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <div className="mx-0.5 h-6 w-px bg-[#1b1530]/15" />;

function Swatch({
  fill,
  on,
  label,
  onClick,
  round = true,
}: {
  fill: string;
  on: boolean;
  label: string;
  onClick: () => void;
  round?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onMouseDown={keep}
      onPointerDown={keep}
      onClick={onClick}
      className={`size-6 shrink-0 border-[1.5px] border-[#1b1530]/60 transition-transform ${round ? "rounded-full" : "rounded-[3px]"} ${on ? "scale-110 ring-2 ring-[#1b1530] ring-offset-1 ring-offset-cream" : "hover:scale-110"}`}
      style={{ background: fill }}
    />
  );
}

export default function NoticeToolbar({
  face,
  tool,
  onTool,
  ink,
  onInk,
  width,
  onWidth,
  textSize,
  onTextSize,
  activeText,
  color,
  onColor,
  paper,
  onPaper,
  canUndo,
  onUndo,
}: {
  face: Face;
  tool: Tool;
  onTool: (t: Tool) => void;
  ink: Ink;
  onInk: (i: Ink) => void;
  width: PenWidth;
  onWidth: (w: PenWidth) => void;
  textSize: TextSize;
  onTextSize: (s: TextSize) => void;
  /** The focused text box's editable, if any. */
  activeText: HTMLElement | null;
  color: NoteColor;
  onColor: (c: NoteColor) => void;
  paper: Paper;
  onPaper: (p: Paper) => void;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const [format, setFormat] = useState({
    size: null as TextSize | null,
    bold: false,
    bullet: false,
  });

  useEffect(() => {
    if (!activeText) return;
    const read = () => setFormat(selectionFormat(activeText));
    read();
    document.addEventListener("selectionchange", read);
    return () => document.removeEventListener("selectionchange", read);
  }, [activeText]);

  const shown = activeText
    ? format
    : { size: textSize, bold: false, bullet: false };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border-[1.5px] border-[#1b1530]/20 bg-cream px-1.5 py-1 text-[#1b1530] shadow-[2px_3px_0_rgba(27,21,48,0.18)]">
      <Btn label="Type" on={tool === "type"} onClick={() => onTool("type")}>
        <TypeIcon className="size-4" />
      </Btn>
      <Btn label="Pen" on={tool === "pen"} onClick={() => onTool("pen")}>
        <PenLineIcon className="size-4" />
      </Btn>
      <Btn
        label="Eraser"
        on={tool === "eraser"}
        onClick={() => onTool("eraser")}
      >
        <EraserIcon className="size-4" />
      </Btn>
      <Sep />
      {tool === "type" ? (
        <>
          {TEXT_SIZES.map((s) => (
            <Btn
              key={s}
              label={`Text size ${SIZE_LABEL[s]}`}
              on={shown.size === s}
              onClick={() => {
                onTextSize(s);
                if (activeText) setBlockSize(activeText, s);
              }}
            >
              {SIZE_LABEL[s]}
            </Btn>
          ))}
          <Btn
            label="Bold"
            on={shown.bold}
            disabled={!activeText}
            onClick={() => activeText && toggleBold(activeText)}
          >
            <BoldIcon className="size-4" />
          </Btn>
          <Btn
            label="Bullet list"
            on={shown.bullet}
            disabled={!activeText}
            onClick={() => activeText && toggleBullet(activeText)}
          >
            <ListIcon className="size-4" />
          </Btn>
        </>
      ) : tool === "pen" ? (
        PEN_WIDTHS.map((w) => (
          <Btn
            key={w}
            label={`Pen width ${w}`}
            on={width === w}
            onClick={() => onWidth(w)}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: w + 2, height: w + 2 }}
            />
          </Btn>
        ))
      ) : (
        <span className="px-1 text-[11px] text-[#1b1530]/60">
          Rub over a line to erase it
        </span>
      )}
      {tool !== "eraser" && (
        <>
          <Sep />
          <div className="flex items-center gap-1 px-0.5">
            {INKS.map((i) => (
              <Swatch
                key={i}
                fill={INK_HEX[i]}
                on={ink === i}
                label={`Ink ${i}`}
                onClick={() => onInk(i)}
              />
            ))}
          </div>
        </>
      )}
      <Sep />
      <div className="flex items-center gap-1 px-0.5">
        {face === "sticky"
          ? NOTE_COLORS.map((c) => (
              <Swatch
                key={c}
                round={false}
                fill={NOTE_STYLES[c].background as string}
                on={color === c}
                label={`Sticky note ${c}`}
                onClick={() => onColor(c)}
              />
            ))
          : PAPERS.map((p) => (
              <Swatch
                key={p}
                round={false}
                fill={PAPER_HEX[p]}
                on={paper === p}
                label={`Poster paper ${p}`}
                onClick={() => onPaper(p)}
              />
            ))}
      </div>
      <Sep />
      <Btn label="Undo" disabled={!canUndo} onClick={onUndo}>
        <Undo2Icon className="size-4" />
      </Btn>
    </div>
  );
}
