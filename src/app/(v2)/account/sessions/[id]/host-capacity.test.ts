import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  editor: null as unknown,
  update: vi.fn(),
  Refused: class extends Error {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session-ownership", () => ({
  editSessionAccess: async () => h.editor,
}));
vi.mock("@/lib/schedule-store", () => ({
  CapacityBelowGoingError: h.Refused,
  explainDbError: (e: Error) => ({ error: e.message }),
  updateSessionAsHost: h.update,
}));

import { saveHostSession } from "./actions";

const SESSION = "11111111-1111-4111-8111-111111111111";

const form = () => {
  const data = new FormData();
  data.set("title", "The Talk");
  data.set("description", "Rewritten");
  data.set("category", "workshop");
  data.set("maxCapacity", "4");
  return data;
};
const submitted = {
  title: "The Talk",
  description: "Rewritten",
  category: "workshop",
  maxCapacity: "4",
};

beforeEach(() => {
  h.update.mockReset();
  h.update.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveHostSession", () => {
  it("shows a host the refusal on the capacity field", async () => {
    h.editor = { userId: "me", via: "host" };
    h.update.mockRejectedValue(new h.Refused("6 people are already going"));
    await expect(saveHostSession(SESSION, {}, form())).resolves.toEqual({
      error: "6 people are already going",
      field: "maxCapacity",
      values: submitted,
    });
    expect(h.update.mock.calls[0][2]).toEqual({ allowBelowGoing: false });
  });

  it("hands back what was submitted when the database refuses", async () => {
    h.editor = { userId: "me", via: "host" };
    h.update.mockRejectedValue(new Error("down"));
    await expect(saveHostSession(SESSION, {}, form())).resolves.toEqual({
      error: "down",
      values: submitted,
    });
  });

  it("hands back what was submitted when validation refuses", async () => {
    h.editor = { userId: "me", via: "host" };
    const data = form();
    data.set("minCapacity", "9");
    const result = await saveHostSession(SESSION, {}, data);
    expect(result.field).toBe("minCapacity");
    expect(result.values).toEqual({ ...submitted, minCapacity: "9" });
    expect(h.update).not.toHaveBeenCalled();
  });

  it("returns no draft once saved, so the form shows what's stored", async () => {
    h.editor = { userId: "me", via: "host" };
    const result = await saveHostSession(SESSION, {}, form());
    expect(result.savedAt).toEqual(expect.any(Number));
    expect(result.values).toBeUndefined();
  });

  it("keeps staff on this form free to go below who's going", async () => {
    h.editor = { userId: "me", via: "team" };
    await saveHostSession(SESSION, {}, form());
    expect(h.update.mock.calls[0][2]).toEqual({ allowBelowGoing: true });
  });

  it("refuses someone who can't edit before anything else", async () => {
    h.editor = null;
    await expect(saveHostSession(SESSION, {}, form())).resolves.toEqual({
      error: "You can't edit this session.",
    });
    expect(h.update).not.toHaveBeenCalled();
  });
});
