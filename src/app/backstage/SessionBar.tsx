import Link from "next/link";
import { signOut } from "./auth-actions";
import { toolAccess } from "@/lib/admin-auth";

/** Who's signed in + sign out, on the right of every tool's header. */
export default async function SessionBar({ next }: { next: string }) {
  const access = await toolAccess();
  if (!access) return null;

  return (
    <div className="flex shrink-0 items-center gap-3 text-sm whitespace-nowrap text-ink/60">
      <Link href="/account" className="hidden hover:text-meeple sm:inline">
        {access.name}
      </Link>
      <form action={signOut}>
        <input type="hidden" name="next" value={next} />
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
