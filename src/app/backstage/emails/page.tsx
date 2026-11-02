import Link from "next/link";
import { connection } from "next/server";
import ToolSignIn from "@/components/ToolSignIn";
import { can } from "@/lib/access";
import { listSentEmails } from "@/lib/sent-emails";

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

export default async function BackstageEmailsPage() {
  await connection();

  if (!(await can("emails.view")))
    return <ToolSignIn title="Sent Emails" next="/backstage/emails" />;

  const emails = await listSentEmails();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-sm text-ink/60">
        The emails we&rsquo;ve sent to the mailing list, as saved in the
        repo&rsquo;s <code>emails/</code> folder. Sending stays in
        EmailOctopus, so dates and recipients live there.
      </p>
      {emails.length === 0 ? (
        <p className="text-sm text-ink/60">No emails saved yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {emails.map((e) => (
            <li
              key={e.slug}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/backstage/emails/${e.slug}`}
                  className="font-semibold text-navy underline-offset-2 hover:text-meeple hover:underline"
                >
                  {e.subject}
                </Link>
                <p className="text-sm text-ink/60">
                  <code>{e.slug}.html</code>
                  {e.variants.includes("txt") && " · plain text"}
                  {e.variants.includes("min") && " · minified copy"}
                </p>
              </div>
              <span className="text-sm whitespace-nowrap text-ink/50">
                {kb(e.bytes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
