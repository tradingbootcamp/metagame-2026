// Shared persisted-currency store for the tickets UI. The *visible* toggle/prices
// are driven by the html[data-currency] attribute (set before first paint by an
// inline script in the root layout), so the display never flashes USD→BTC on load.
// This store mirrors that value into React for the checkout actions + aria state;
// setCurrency() keeps localStorage, the attribute, and subscribers in sync.
//
// Lives in its own module so every ticket button (standard + supporter) reads the
// same single toggle — there's exactly one currency for the whole tickets section.

export type Currency = "usd" | "btc";

const CURRENCY_KEY = "ticket-currency";
const listeners = new Set<() => void>();

export function subscribeCurrency(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getCurrencySnapshot(): Currency {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (saved === "btc" || saved === "usd") return saved;
  } catch {
    // localStorage unavailable — fall through to the USD default.
  }
  return "usd";
}

export function getCurrencyServerSnapshot(): Currency {
  return "usd";
}

export function setCurrency(next: Currency) {
  try {
    localStorage.setItem(CURRENCY_KEY, next);
  } catch {
    // best-effort persistence
  }
  if (typeof document !== "undefined") {
    document.documentElement.dataset.currency = next;
  }
  listeners.forEach((fn) => fn());
}
