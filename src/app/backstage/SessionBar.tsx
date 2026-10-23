import Link from "next/link";
import { signOut } from "./auth-actions";
import { toolAccess } from "@/lib/admin-auth";

/** Who's signed in + sign out, on the right of every tool's header. */
export default async function SessionBar() {
  const access = await toolAccess();
  if (!access) return null;

  return (
    <div className="flex items-center gap-3 text-sm text-ink/60">
      {access.via === "account" ? (
        <Link href="/account" className="hover:text-meeple">
          {access.name}
        </Link>
      ) : (
        access.name && <span>{access.name}</span>
      )}
      <form action={signOut}>
        <button
          type="submit"
          className="underline underline-offset-2 hover:text-meeple"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
