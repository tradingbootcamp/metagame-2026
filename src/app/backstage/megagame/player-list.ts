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

export function listHref(path: string, ids: readonly string[]): string {
  if (ids.length === 0) return path;
  return `${path}?${new URLSearchParams({ players: ids.join(",") })}`;
}
