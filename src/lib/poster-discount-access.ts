import "server-only";
import { requireAccess } from "./admin-auth";

export async function posterDiscountAccess() {
  const links = await requireAccess("links.manage");
  if (!links || !(await requireAccess("promo.manage"))) return null;
  return links;
}
