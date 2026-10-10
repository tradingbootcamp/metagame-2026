/**
 * The spelling of `name` already in use among `labels` (link creators, the
 * grader roster): exact match, else same first name, else `name` itself.
 * Case-insensitive. Labels only drive filters and attribution, never access,
 * so a first-name collision mislabels a filter at worst.
 */
export function matchLabel(name: string, labels: string[]): string {
  const lower = name.toLowerCase();
  const first = lower.split(/\s+/)[0];
  const firstOf = (l: string) => l.toLowerCase().split(/\s+/)[0];
  return (
    labels.find((l) => l.toLowerCase() === lower) ??
    labels.find((l) => firstOf(l) === first) ??
    name
  );
}
