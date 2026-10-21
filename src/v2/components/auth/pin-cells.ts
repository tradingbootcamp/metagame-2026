/**
 * Writes `chars` into `cells` starting at `from`, dropping overflow. Returns the
 * new cells and the index to focus next.
 */
export function fillCells(
  cells: readonly string[],
  from: number,
  chars: string,
): { cells: string[]; focus: number } {
  const incoming = chars.slice(0, cells.length - from);
  const next = [...cells];
  for (let i = 0; i < incoming.length; i++) next[from + i] = incoming[i];
  return { cells: next, focus: from + incoming.length };
}

/**
 * A box's new raw value after a keystroke. When the box already held a char
 * and the caret wasn't selecting it, the browser hands us both; keep the new one.
 */
export function typedChars(previous: string, raw: string): string {
  if (previous && raw.length === 2) {
    if (raw[0] === previous) return raw[1];
    if (raw[1] === previous) return raw[0];
  }
  return raw;
}
