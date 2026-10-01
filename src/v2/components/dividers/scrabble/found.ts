// The words this browser has cast, and whether DICT's book and TYPE's entry
// are out. All in localStorage, so the list is still there after a reload has undone the
// rack. Read lazily on the client, blank on the server: same hydration
// story as the rack in index.tsx.
import { useSyncExternalStore } from "react";

type Found = { words: string[]; open: boolean; typing: boolean };

const WORDS_KEY = "scrabble-found";
const OPEN_KEY = "scrabble-dict";
const TYPING_KEY = "scrabble-type";
const EMPTY: Found = { words: [], open: false, typing: false };

let found: Found | null = null;
const listeners = new Set<() => void>();

const load = (): Found => {
  try {
    const raw = JSON.parse(localStorage.getItem(WORDS_KEY) ?? "[]");
    return {
      words: Array.isArray(raw) ? raw.filter((w) => typeof w === "string") : [],
      open: localStorage.getItem(OPEN_KEY) === "1",
      typing: localStorage.getItem(TYPING_KEY) === "1",
    };
  } catch {
    return EMPTY;
  }
};

const save = (next: Found) => {
  found = next;
  try {
    localStorage.setItem(WORDS_KEY, JSON.stringify(next.words));
    localStorage.setItem(OPEN_KEY, next.open ? "1" : "0");
    localStorage.setItem(TYPING_KEY, next.typing ? "1" : "0");
  } catch {
    // Storage blocked: the list lasts the page, no more.
  }
  listeners.forEach((l) => l());
};

const getSnapshot = () => (found ??= load());
const getServerSnapshot = () => EMPTY;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const recordFind = (word: string) => {
  const cur = getSnapshot();
  if (cur.words.includes(word)) return;
  save({ ...cur, words: [...cur.words, word] });
};

export const openDict = () => {
  const cur = getSnapshot();
  if (!cur.open) save({ ...cur, open: true });
};

export const openType = () => {
  const cur = getSnapshot();
  if (!cur.typing) save({ ...cur, typing: true });
};

// The /dividers reset: the book and the entry go, and the list with them.
export const clearFound = () => save(EMPTY);

export const useFound = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
