import Link from "next/link";
import { connection } from "next/server";
import QrDownload from "../../links/QrDownload";
import SignIn from "../../SignIn";
import { windowText } from "../format";
import Section from "../Section";
import ImportForm from "./ImportForm";
import { toolAccess } from "@/lib/admin-auth";
import { CLASS_LABELS, isMegagameClass } from "@/lib/megagame-levels";
import { listQuests } from "@/lib/megagame-store";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import { formatTicketCode } from "@/lib/ticket-code-format";

const TOOL = "/backstage/megagame";

export default async function QuestsPage() {
  await connection();
  const access = await toolAccess("megagame.manage");
  if (!access) return <SignIn next={`${TOOL}/quests`} />;

  const [quests, origin] = await Promise.all([
    listQuests(),
    siteOriginFromHeaders(),
  ]);

  return (
    <>
      <Section title="Import quests">
        <ImportForm />
        <div className="flex flex-col gap-2 text-sm text-ink/70">
          <p>
            The first row names the columns: code, title, class, kind, answers,
            evidence, hint, min_level, max_level and active. Only title and kind
            are required, and the columns can come in any order.
          </p>
          <p>
            Kind is answer or evidence. Separate several accepted answers with a
            | character. Class is wizard, pirate or alien, or blank for any
            class. A level window needs a class.
          </p>
          <p>
            Leave the code blank to add a new quest with a fresh code. Give an
            existing code to replace that quest&rsquo;s details. Pasting the
            same code-less rows twice adds them twice.
          </p>
          <p>
            Active is true or false (yes/no and 1/0 also work). Set it to false
            on an existing code to withdraw that quest. A blank active leaves an
            existing quest as it was and makes a new quest active.
          </p>
        </div>
      </Section>

      <Section title={`Quests (${quests.length})`}>
        {quests.length === 0 ? (
          <p className="text-sm text-ink/60">No quests yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
            {quests.map((q) => {
              const meta = [
                q.class && isMegagameClass(q.class)
                  ? CLASS_LABELS[q.class]
                  : "Any class",
                q.kind === "answer" ? "Answer" : "Evidence",
                windowText(q),
              ].filter(Boolean);
              return (
                <li key={q.id} className="flex flex-col gap-3 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`${TOOL}/q/${q.code}`}
                      className="min-w-0 font-medium text-navy underline-offset-2 hover:text-meeple hover:underline"
                    >
                      {q.title}
                    </Link>
                    <span className="shrink-0 font-space-mono text-sm font-bold text-navy">
                      {formatTicketCode(q.code)}
                    </span>
                  </div>
                  <p className="text-sm text-ink/70">
                    {meta.join(" · ")}
                    {!q.active && (
                      <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink/70">
                        Inactive
                      </span>
                    )}
                  </p>
                  <QrDownload
                    url={`${origin}/q/${q.code}`}
                    slug={q.code}
                    fileName={`quest-${q.code}`}
                    compact
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
