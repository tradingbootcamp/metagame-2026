// The in-progress player list is the `players` query parameter, so a reload,
// a tab switch or a camera detour keeps it.

export const MAX_LIST = 40;

export function parsePlayerIds(param: string | string[] | undefined): string[] {
  const raw = Array.isArray(param) ? param[0] : param;
  const ids = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_LIST);
}

export const withPlayer = (ids: readonly string[], id: string) =>
  ids.includes(id) ? [...ids] : [...ids, id].slice(0, MAX_LIST);

export const withoutPlayer = (ids: readonly string[], id: string) =>
  ids.filter((x) => x !== id);

export function listHref(
  path: string,
  ids: readonly string[],
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams(
    ids.length > 0 ? { players: ids.join(",") } : {},
  );
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
