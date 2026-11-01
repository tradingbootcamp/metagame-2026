import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, store } = vi.hoisted(() => ({
  auth: { toolAccess: vi.fn() },
  store: { exportEventTable: vi.fn() },
}));
vi.mock("@/lib/admin-auth", () => auth);
vi.mock("@/lib/megagame-store", () => store);

import { GET } from "./route";

const call = (table: string) =>
  GET(
    new Request(`https://x.test/backstage/megagame/dashboard/export/${table}`),
    {
      params: Promise.resolve({ table }),
    } as never,
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.toolAccess.mockResolvedValue({ name: "Vol", userId: "v1" });
});

describe("event table export", () => {
  it("is a 404 without megagame.verify and reads nothing", async () => {
    auth.toolAccess.mockResolvedValue(null);
    const res = await call("level_events");
    expect(auth.toolAccess).toHaveBeenCalledWith("megagame.verify");
    expect(res.status).toBe(404);
    expect(store.exportEventTable).not.toHaveBeenCalled();
  });

  it("is a 404 for a table outside the event tables", async () => {
    const res = await call("user");
    expect(res.status).toBe(404);
    expect(store.exportEventTable).not.toHaveBeenCalled();
  });

  it("downloads the table as CSV", async () => {
    store.exportEventTable.mockResolvedValue({
      columns: ["id", "level"],
      rows: [["e1", 2]],
    });
    const res = await call("level_events");
    expect(store.exportEventTable).toHaveBeenCalledWith("level_events");
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="megagame-level_events-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.text()).toBe("id,level\r\ne1,2\r\n");
  });
});
