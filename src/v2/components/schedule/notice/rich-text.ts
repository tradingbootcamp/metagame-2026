// The DOM side of a text box: a contentEditable div whose block children are
// paragraphs (data-size, data-bullet) holding plain text and <b>. These turn
// that DOM into Paras and back. The HTML is only ever built here, from
// structured data, so nothing a viewer typed is parsed as markup.

import type { Para, Run, TextSize } from "@/lib/notice-doc";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const runHtml = (r: Run) => {
  const text = escape(r.t).replace(/\n/g, "<br>");
  return r.b ? `<b>${text}</b>` : text;
};

export function parasToHtml(paras: Para[]): string {
  const list = paras.length ? paras : [{ size: "m" as TextSize, runs: [] }];
  return list
    .map((p) => {
      const inner = p.runs.map(runHtml).join("");
      const attrs = `data-size="${p.size}"${p.bullet ? " data-bullet" : ""}`;
      // An empty block needs a <br> or the caret has nowhere to sit.
      return `<div ${attrs}>${inner || "<br>"}</div>`;
    })
    .join("");
}

const BLOCKS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "UL", "OL"]);

const isBlock = (n: Node): n is HTMLElement =>
  n.nodeType === Node.ELEMENT_NODE && BLOCKS.has((n as HTMLElement).tagName);

const isBoldEl = (el: HTMLElement) =>
  el.tagName === "B" ||
  el.tagName === "STRONG" ||
  Number(el.style.fontWeight) >= 600 ||
  el.style.fontWeight === "bold";

const sizeOf = (el: HTMLElement, fallback: TextSize): TextSize => {
  const s = el.dataset.size;
  return s === "s" || s === "m" || s === "l" || s === "xl" ? s : fallback;
};

/** The editable's DOM as paragraphs. */
export function serialize(root: HTMLElement, fallback: TextSize): Para[] {
  const paras: Para[] = [];
  let open: Para | null = null;

  const push = (t: string, b: boolean, size: TextSize, bullet: boolean) => {
    if (!open) {
      open = { size, ...(bullet && { bullet: true as const }), runs: [] };
      paras.push(open);
    }
    const last = open.runs.at(-1);
    if (last && !!last.b === b) last.t += t;
    else open.runs.push(b ? { t, b: true } : { t });
  };

  const walk = (node: Node, bold: boolean, size: TextSize, bullet: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? "").replace(/ /g, " ");
      if (t) push(t, bold, size, bullet);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      // A lone trailing <br> is the empty block's placeholder, not a line.
      if (el.nextSibling || el.previousSibling) push("\n", bold, size, bullet);
      else if (!open) push("", bold, size, bullet);
      return;
    }
    if (BLOCKS.has(el.tagName)) {
      const s = sizeOf(el, size);
      const bl =
        el.hasAttribute("data-bullet") || el.tagName === "LI" || bullet;
      open = null;
      // Opened even when empty, so a blank line between paragraphs survives.
      open = { size: s, ...(bl && { bullet: true as const }), runs: [] };
      paras.push(open);
      for (const c of el.childNodes) walk(c, bold, s, bl);
      open = null;
      return;
    }
    const b = bold || isBoldEl(el);
    for (const c of el.childNodes) walk(c, b, size, bullet);
  };

  for (const c of root.childNodes) walk(c, false, fallback, false);
  // Paragraphs that were split around nested blocks can end up empty twins;
  // runs that are only the placeholder are dropped.
  return paras.map((p) => ({
    ...p,
    runs: p.runs.filter((r) => r.t.length > 0),
  }));
}

/**
 * Typing into an editable that has lost all its blocks puts text straight
 * into the root. Wrap any loose inline content in a block, keeping the caret
 * where it was.
 */
export function normalize(root: HTMLElement, size: TextSize) {
  const loose = [...root.childNodes].filter((n) => !isBlock(n));
  if (loose.length === 0) return;
  const sel = window.getSelection();
  const anchor = sel?.anchorNode;
  const offset = sel?.anchorOffset ?? 0;
  let block: HTMLElement | null = null;
  for (const n of [...root.childNodes]) {
    if (isBlock(n)) {
      block = null;
      continue;
    }
    if (!block) {
      block = document.createElement("div");
      block.dataset.size = size;
      root.insertBefore(block, n);
    }
    block.appendChild(n);
  }
  if (sel && anchor && root.contains(anchor)) {
    const range = document.createRange();
    range.setStart(anchor, Math.min(offset, anchor.textContent?.length ?? 0));
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/** The paragraph blocks the selection touches, inside `root`. */
function selectedBlocks(root: HTMLElement): HTMLElement[] {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return [];
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return [];
  return [...root.children].filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && range.intersectsNode(el),
  );
}

export function setBlockSize(root: HTMLElement, size: TextSize) {
  normalize(root, size);
  for (const el of selectedBlocks(root)) el.dataset.size = size;
  root.dispatchEvent(new Event("input", { bubbles: true }));
}

export function toggleBullet(root: HTMLElement) {
  normalize(root, "m");
  const blocks = selectedBlocks(root);
  const on = !blocks.every((b) => b.hasAttribute("data-bullet"));
  for (const el of blocks) {
    if (on) el.setAttribute("data-bullet", "");
    else el.removeAttribute("data-bullet");
  }
  root.dispatchEvent(new Event("input", { bubbles: true }));
}

export function toggleBold(root: HTMLElement) {
  // Deprecated but still the only way to bold a selection that spans nodes
  // without writing a range splitter; every browser still implements it.
  document.execCommand("styleWithCSS", false, "false");
  document.execCommand("bold");
  root.dispatchEvent(new Event("input", { bubbles: true }));
}

/** The caret's paragraph size and bold state, for the toolbar to reflect. */
export function selectionFormat(root: HTMLElement): {
  size: TextSize | null;
  bold: boolean;
  bullet: boolean;
} {
  const blocks = selectedBlocks(root);
  const first = blocks[0];
  return {
    size: first ? sizeOf(first, "m") : null,
    bold: document.queryCommandState("bold"),
    bullet: !!first?.hasAttribute("data-bullet"),
  };
}
