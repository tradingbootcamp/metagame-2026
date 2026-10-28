import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ToolSignIn from "@/components/ToolSignIn";
import { can } from "@/lib/access";
import {
  type EmailVariant,
  findSentEmail,
  isEmailVariant,
  readSentEmail,
} from "@/lib/sent-emails";

const VARIANT_LABEL: Record<EmailVariant, string> = {
  html: "HTML",
  min: "Minified",
  txt: "Plain text",
};

export default async function BackstageEmailPage(
  props: PageProps<"/backstage/emails/[slug]">,
) {
  await connection();

  const { slug } = await props.params;
  if (!(await can("emails.view")))
    return (
      <ToolSignIn title="Sent Emails" next={`/backstage/emails/${slug}`} />
    );

  const email = await findSentEmail(slug);
  if (!email) notFound();

  const { v } = await props.searchParams;
  const variant: EmailVariant = isEmailVariant(v) ? v : "html";
  const raw = `/backstage/emails/${slug}/raw`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="font-bebas text-2xl tracking-wide text-navy">
          {email.subject}
        </h1>
        <nav className="flex items-center gap-3 text-sm">
          {email.variants.map((it) =>
            it === variant ? (
              <span key={it} className="font-semibold text-navy">
                {VARIANT_LABEL[it]}
              </span>
            ) : (
              <Link
                key={it}
                href={`/backstage/emails/${slug}?v=${it}`}
                className="text-ink/60 underline-offset-2 hover:text-meeple hover:underline"
              >
                {VARIANT_LABEL[it]}
              </Link>
            ),
          )}
          <a
            href={`${raw}?v=${variant}`}
            target="_blank"
            rel="noreferrer"
            className="text-ink/60 underline-offset-2 hover:text-meeple hover:underline"
          >
            Open source ↗
          </a>
        </nav>
      </div>
      {variant === "txt" ? (
        <pre className="overflow-x-auto rounded-xl border border-line bg-white p-4 font-mono text-sm whitespace-pre-wrap">
          {await readSentEmail(slug, "txt")}
        </pre>
      ) : (
        // Scripts off; the templates have none, and this way a pasted one can't gain any.
        <iframe
          src={`${raw}?v=${variant}`}
          sandbox=""
          title={email.subject}
          className="h-[calc(100dvh-10rem)] w-full rounded-xl border border-line bg-white"
        />
      )}
    </div>
  );
}
