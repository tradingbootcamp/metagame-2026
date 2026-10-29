import { useSyncExternalStore } from "react";

// The sessions you've turned over on /sessions (from a pack, or opened from
// the deck), as a collection to fill. Kept in this browser only, like visited
// links; nothing leaves it.
const KEY = "sessions-collected";
const EMPTY: ReadonlySet<string> = new Set();
let cache: ReadonlySet<string> | null = null;
const listeners = new Set<() => void>();

function read(): ReadonlySet<string> {
  if (!cache) {
    try {
      cache = new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      cache = new Set();
    }
  }
  return cache;
}

export function collect(...slugs: string[]) {
  const have = read();
  const fresh = slugs.filter((s) => !have.has(s));
  if (!fresh.length) return;
  cache = new Set([...have, ...fresh]);
  try {
    localStorage.setItem(KEY, JSON.stringify([...cache]));
  } catch {
    // Storage blocked: the collection lasts as long as the page.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useCollection(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
