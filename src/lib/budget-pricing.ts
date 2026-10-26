// Anthropic list prices, USD per million tokens, as of 2026-10-26. Only the
// models the budget tool is likely to run; anything else shows tokens only.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export function costUsd(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const key = Object.keys(PRICES).find((k) => model?.startsWith(k));
  if (!key) return null;
  const p = PRICES[key];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export const usd = (n: number | null): string =>
  n === null ? "" : n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`;

export const tokens = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
