import { revalidatePath } from "next/cache";
import { authorize, error, json, readBody, str } from "@/lib/admin-api";
import { formatBadgeCode } from "@/lib/badge-code";
import { parseBadgeInput } from "@/lib/checkin";
import { badgeWearer } from "@/lib/checkin-store";
import { assignBadgeCode } from "@/lib/ticket-store";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/tickets/[id]/badge">;

const PAGES = ["/backstage/tickets", "/backstage/users", "/backstage/checkin"];
const refresh = () => PAGES.forEach((p) => revalidatePath(p));

/** `{badgeCode}`: the sticker number, one to four digits. */
export async function PUT(request: Request, ctx: Ctx) {
  const access = await authorize("tickets.edit");
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { id } = await ctx.params;
  const code = parseBadgeInput(str(body, "badgeCode").slice(0, 20));
  if (code === null) return error("Required.", 400, "badgeCode");
  if (code === undefined)
    return error("A badge code is one to four digits.", 400, "badgeCode");
  const result = await assignBadgeCode(id, code);
  if (!result.ok) {
    if (result.reason === "taken") {
      const wearer = await badgeWearer(code);
      return error(
        `Badge ${formatBadgeCode(code)} is already on ${wearer ?? "another ticket"}.`,
        409,
        "badgeCode",
      );
    }
    if (result.reason === "invalid")
      return error("A badge code is one to four digits.", 400, "badgeCode");
    return error("No such ticket.", 404);
  }
  refresh();
  return json({ badgeCode: formatBadgeCode(code) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const access = await authorize("tickets.edit");
  if (access instanceof Response) return access;
  const { id } = await ctx.params;
  const result = await assignBadgeCode(id, null);
  if (!result.ok) return error("No such ticket.", 404);
  refresh();
  return json({ badgeCode: null });
}
