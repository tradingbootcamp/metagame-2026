"use client";

import { useCallback, useRef, useState } from "react";
import type { Ink, PenWidth, TextSize } from "@/lib/notice-doc";
import type { Tool } from "./NoticeCanvas";

// What every notice editor needs behind its toolbar: a document with undo,
// and the tool, ink, width and text size in hand. NoticeDialog edits two
// faces at once and SessionPosterEditor one, so the document type is theirs.

/** Edits to one key (typing into one box) within this long are one undo step. */
const COALESCE_MS = 1500;
const HISTORY_MAX = 100;

export function useUndoable<T>(initial: T) {
  const [draft, setDraft] = useState<T>(initial);
  const draftRef = useRef(draft);
  const history = useRef<T[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  // Bumped by undo, so uncontrolled text boxes reload from the document.
  const [resetKey, setResetKey] = useState(0);

  const commit = useCallback((next: T, key?: string) => {
    const now = Date.now();
    const same =
      key &&
      lastKey.current?.key === key &&
      now - lastKey.current.at < COALESCE_MS;
    if (!same) {
      history.current.push(draftRef.current);
      if (history.current.length > HISTORY_MAX) history.current.shift();
      setCanUndo(true);
    }
    lastKey.current = key ? { key, at: now } : null;
    draftRef.current = next;
    setDraft(next);
  }, []);

  /** Replaces the document outright and reloads the boxes, as a reset does. */
  const reload = useCallback(
    (next: T) => {
      commit(next);
      setResetKey((k) => k + 1);
    },
    [commit],
  );

  /**
   * Swaps the document in without an undo step, for content that arrives
   * from the server after the editor opened: undoing to before it would be
   * undoing to a page that was never really there.
   */
  const replace = useCallback((next: T) => {
    lastKey.current = null;
    draftRef.current = next;
    setDraft(next);
    setResetKey((k) => k + 1);
  }, []);

  const undo = useCallback((): boolean => {
    const prev = history.current.pop();
    if (prev === undefined) return false;
    setCanUndo(history.current.length > 0);
    lastKey.current = null;
    draftRef.current = prev;
    setDraft(prev);
    setResetKey((k) => k + 1);
    return true;
  }, []);

  return {
    draft,
    draftRef,
    commit,
    reload,
    replace,
    undo,
    canUndo,
    resetKey,
  };
}

export type ActiveText<Extra = object> = {
  el: HTMLElement;
  id: string;
} & Extra;

export function useNoticeTools<Extra = object>() {
  const [tool, setTool] = useState<Tool>("type");
  const [ink, setInk] = useState<Ink>("ink");
  const [width, setWidth] = useState<PenWidth>(5);
  const [textSize, setTextSize] = useState<TextSize>("l");
  const [activeText, setActiveText] = useState<ActiveText<Extra> | null>(null);

  // A box that stops being editable keeps focus and its selection without
  // ever firing blur, so it is let go of explicitly; otherwise the toolbar
  // would go on formatting a box nobody is looking at.
  const releaseText = useCallback(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement && el.isContentEditable) el.blur();
    window.getSelection()?.removeAllRanges();
    setActiveText(null);
  }, []);

  const pickTool = useCallback(
    (t: Tool) => {
      if (t !== "type") releaseText();
      setTool(t);
    },
    [releaseText],
  );

  return {
    tool,
    pickTool,
    ink,
    setInk,
    width,
    setWidth,
    textSize,
    setTextSize,
    // The toolbar formats only a box that is still editable.
    activeText,
    activeEditable: activeText?.el.isContentEditable ? activeText.el : null,
    setActiveText,
    releaseText,
  };
}

/**
 * An element's inner size (inside its padding), measured as soon as it
 * mounts and again whenever it changes. A callback ref, because dialogs
 * mount their content after the component that owns them, when an effect
 * has nothing to measure.
 */
export function useMeasuredSize(): [
  (el: HTMLElement | null) => void,
  { w: number; h: number },
] {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    // An observer only reports on a frame the page paints; read now too.
    const cs = getComputedStyle(el);
    const pad = (v: string) => parseFloat(v) || 0;
    setSize({
      w: el.clientWidth - pad(cs.paddingLeft) - pad(cs.paddingRight),
      h: el.clientHeight - pad(cs.paddingTop) - pad(cs.paddingBottom),
    });
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    observer.current = ro;
  }, []);
  return [ref, size];
}
