// Tells the server an easter egg was found, so we can see whether anyone
// finds these. Fire-and-forget: nothing here may delay or break an egg.
export type Via = "click" | "type";

// What /api/egg accepts. A `clicks` event carries this visit's running total
// and overwrites its one row; every other event is a row of its own.
export type EggEvent =
  | { egg: "scrabble"; event: "cast"; word: string; via: Via }
  | { egg: "tetris" | "chess"; event: "clicks"; clicks: number }
  | { egg: "chess"; event: "castle" }
  | { egg: "tetris"; event: "clear" };

// Groups one browser's eggs together and nothing more: a random code kept in
// localStorage, so it survives reloads (how you get a finished rack back) and
// return visits (do people come back for more?). It's tied to no one — no name,
// email or IP goes with it. Falls back to per-load if storage is unavailable.
const KEY = "egg-visit";
let visit: string | undefined;

const visitId = () => {
  if (visit) return visit;
  try {
    visit = localStorage.getItem(KEY) ?? undefined;
    if (!visit) {
      visit = Math.random().toString(36).slice(2, 8);
      localStorage.setItem(KEY, visit);
    }
  } catch {
    visit ??= Math.random().toString(36).slice(2, 8);
  }
  return visit;
};

export function trackEgg(e: EggEvent) {
  try {
    navigator.sendBeacon(
      "/api/egg",
      new Blob([JSON.stringify({ ...e, visit: visitId() })], {
        type: "application/json",
      }),
    );
  } catch {
    // No beacon support, or blocked: not worth a fallback.
  }
}

// Clicks are sent as a total, not one by one: Airtable can't increment, and
// two upserts racing each other would both create the row. So the count lives
// here (and in localStorage, to carry across visits) and goes out once the
// clicking pauses, or when the page is left mid-flurry.
const SETTLE_MS = 1500;
const pending = new Map<"tetris" | "chess", ReturnType<typeof setTimeout>>();
const totals = new Map<"tetris" | "chess", number>();
let listening = false;

const flush = (egg: "tetris" | "chess") => {
  clearTimeout(pending.get(egg));
  pending.delete(egg);
  trackEgg({ egg, event: "clicks", clicks: totals.get(egg)! });
};

export function trackClick(egg: "tetris" | "chess") {
  const key = `egg-clicks-${egg}`;
  let total = totals.get(egg);
  try {
    total ??= Number(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, String(total + 1));
  } catch {
    total ??= 0;
  }
  totals.set(egg, total + 1);
  if (!listening) {
    listening = true;
    window.addEventListener("pagehide", () =>
      [...pending.keys()].forEach(flush),
    );
  }
  clearTimeout(pending.get(egg));
  pending.set(
    egg,
    setTimeout(() => flush(egg), SETTLE_MS),
  );
}
