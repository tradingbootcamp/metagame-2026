import { revalidatePath } from "next/cache";
import { authorize, error, json, readBody, str } from "@/lib/admin-api";
import { canRefer } from "@/lib/referral";
import { findReferrerTicket, setReferrer } from "@/lib/referral-store";
import {
  formatTicketCode,
  normalizeTicketCode,
} from "@/lib/ticket-code-format";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/tickets/[id]/referral">;

/** `{referrerCode}`: the referrer's ticket code or referral code. */
export async function PUT(request: Request, ctx: Ctx) {
  const access = await authorize("tickets.edit");
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { id } = await ctx.params;
  const code = normalizeTicketCode(str(body, "referrerCode"));
  if (!code) return error("Required.", 400, "referrerCode");
  const referrer = await findReferrerTicket(code);
  if (!referrer)
    return error("No paid ticket has that code.", 404, "referrerCode");
  if (referrer.paymentId === id)
    return error("A ticket can't refer itself.", 400, "referrerCode");
  if (!canRefer(referrer.tier))
    return error("That ticket's tier can't refer.", 400, "referrerCode");
  if (!(await setReferrer(id, referrer.paymentId)))
    return error("No such ticket.", 404);
  revalidatePath("/backstage/tickets");
  return json({ referredBy: formatTicketCode(referrer.ticketCode) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const access = await authorize("tickets.edit");
  if (access instanceof Response) return access;
  const { id } = await ctx.params;
  if (!(await setReferrer(id, null))) return error("No such ticket.", 404);
  revalidatePath("/backstage/tickets");
  return json({ referredBy: null });
}
