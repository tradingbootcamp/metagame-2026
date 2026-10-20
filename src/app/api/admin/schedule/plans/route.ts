import { authorize, error, json } from "@/lib/schedule-api";
import { findAccount, loadAccountPlans } from "@/lib/schedule-store";

export const dynamic = "force-dynamic";

/** `?email=`: that account's RSVPs and bookmarks. */
export async function GET(request: Request) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const email = new URL(request.url).searchParams.get("email")?.trim();
  if (!email) return error("Pass ?email=.", 400, "email");
  const account = await findAccount(email);
  if (!account) return error(`No account for ${email}.`, 404, "email");
  return json({ account, ...(await loadAccountPlans(account.userId)) });
}
