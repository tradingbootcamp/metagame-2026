import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/next-path";

// Sign-up is folded into /login (it asks for the email first and creates
// the account when the address is new); old links land there.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(Array.isArray(next) ? next[0] : next);
  redirect(
    target === "/account"
      ? "/login"
      : `/login?next=${encodeURIComponent(target)}`,
  );
}
