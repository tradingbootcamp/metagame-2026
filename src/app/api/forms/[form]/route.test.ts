import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/airtable-forms", () => ({
  createFormRow: vi.fn(),
  attachFile: vi.fn(),
}));
vi.mock("@/lib/email", () => ({ sendFormBackupEmail: vi.fn() }));

import { attachFile, createFormRow } from "@/lib/airtable-forms";
import { sendFormBackupEmail } from "@/lib/email";
import { POST } from "./route";

const createRow = vi.mocked(createFormRow);
const attach = vi.mocked(attachFile);
const backUp = vi.mocked(sendFormBackupEmail);

const post = (form: string, body: unknown) =>
  POST(
    new Request(`https://x.test/api/forms/${form}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ form }) },
  );

const sponsor = {
  answers: { name: "Ada", email: "ada@example.com", tier: "Gold" },
};

beforeEach(() => vi.resetAllMocks());

describe("POST /api/forms/[form]", () => {
  it("writes the answers to Airtable by field id", async () => {
    createRow.mockResolvedValue({ stored: true, id: "rec00000000000001" });
    const res = await post("sponsor", sponsor);
    expect(await res.json()).toEqual({
      ok: true,
      stored: true,
      attached: true,
    });
    expect(createRow).toHaveBeenCalledWith("tbluUIxg0YnlMO1jQ", {
      fld42qY2zzbMKiZAC: "Ada",
      fld0okgOArTQTNUir: "ada@example.com",
      fldvRIark8ZyTFpNf: "Gold",
      fldmLx6E4fpMxaVHw: ["sponsoring"],
    });
    expect(backUp).not.toHaveBeenCalled();
  });

  it("emails the answers to the team when Airtable refuses the row", async () => {
    createRow.mockRejectedValue(new Error("Airtable responded 422"));
    backUp.mockResolvedValue(true);
    const res = await post("sponsor", sponsor);
    expect(await res.json()).toEqual({
      ok: true,
      stored: false,
      backedUp: true,
    });
    expect(backUp).toHaveBeenCalledWith(
      expect.objectContaining({
        form: "Sponsor interest",
        replyTo: "ada@example.com",
        answers: [
          { label: "Your name", value: "Ada" },
          { label: "Email", value: "ada@example.com" },
          { label: "Sponsorship tier", value: "Gold" },
        ],
      }),
    );
  });

  it("errors only when neither Airtable nor the email works", async () => {
    createRow.mockRejectedValue(new Error("Airtable responded 503"));
    backUp.mockResolvedValue(false);
    const res = await post("sponsor", sponsor);
    expect(res.status).toBe(500);
  });

  it("sends a picture that didn't upload to the team", async () => {
    createRow.mockResolvedValue({ stored: true, id: "rec00000000000002" });
    attach.mockRejectedValue(new Error("upload failed"));
    backUp.mockResolvedValue(true);
    const picture = {
      name: "cat.jpg",
      type: "image/jpeg",
      size: 3,
      data: "AAAA",
    };
    const res = await post("propose", {
      answers: {
        name: "Ada",
        email: "ada@example.com",
        title: "T",
        description: "D",
        duration: "1 hour",
        age: ["Appropriate for all ages"],
        picture,
      },
    });
    expect(await res.json()).toEqual({
      ok: true,
      stored: true,
      attached: false,
    });
    expect(backUp).toHaveBeenCalledWith(
      expect.objectContaining({ files: [picture] }),
    );
  });

  it("turns away incomplete answers without touching Airtable", async () => {
    const res = await post("sponsor", { answers: { name: "Ada" } });
    expect(res.status).toBe(400);
    expect((await res.json()).errors).toHaveProperty("email");
    expect(createRow).not.toHaveBeenCalled();
  });

  it("tells a bot it worked, and writes nothing", async () => {
    const res = await post("sponsor", { ...sponsor, website: "spam.example" });
    expect((await res.json()).ok).toBe(true);
    expect(createRow).not.toHaveBeenCalled();
  });

  it("knows only its own forms", async () => {
    expect((await post("nope", sponsor)).status).toBe(404);
  });
});
