"use client";

import { useCallback, useSyncExternalStore } from "react";
import { HATS, isHatId, type HatId } from "./hats";

// Which hats the visitor has grabbed, in order. Lives in localStorage so the
// count survives navigating between the home page and the team page.
const KEY = "hat-trick";
const EMPTY: HatId[] = [];

let snapshot: HatId[] | null = null;
const listeners = new Set<() => void>();

function read(): HatId[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isHatId) : [];
  } catch {
    return [];
  }
}

function get() {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

function set(next: HatId[]) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode etc.: the hats still show for this page view
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab grabbing a hat updates this one too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      snapshot = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Fired on every grab attempt, for the toast: a new hat, or one that is
// locked until its prerequisites are worn.
export type CollectEvent = {
  kind: "found" | "locked";
  id: HatId;
  count: number;
};
const collectListeners = new Set<(e: CollectEvent) => void>();
export function onCollect(listener: (e: CollectEvent) => void) {
  collectListeners.add(listener);
  return () => {
    collectListeners.delete(listener);
  };
}

export function useHatTrick() {
  const collected = useSyncExternalStore(subscribe, get, () => EMPTY);
  // Returns false when the hat is locked (its prerequisites aren't worn yet).
  const collect = useCallback((id: HatId) => {
    const current = get();
    if (current.includes(id)) return true;
    const missing = HATS[id].requires?.some((r) => !current.includes(r));
    if (missing) {
      collectListeners.forEach((l) =>
        l({ kind: "locked", id, count: current.length }),
      );
      return false;
    }
    const next = [...current, id];
    set(next);
    collectListeners.forEach((l) =>
      l({ kind: "found", id, count: next.length }),
    );
    return true;
  }, []);
  return { collected, collect };
}
