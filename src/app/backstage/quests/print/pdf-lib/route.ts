import { toolAccess } from "@/lib/admin-auth";
import { createQuestPdf, loadQuestImages } from "@/lib/quest-pdf";
import { formatTicketCode } from "@/lib/ticket-code-format";
import { OVERFLOW_HEADER } from "../overflow";
import { printQuests } from "../quests";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The quest cards drawn straight into a PDF, with the print page's query
 * contract: `?id=…&id=…` for chosen quests, else every active one narrowed
 * by `?class=`. The Chromium route at ../pdf prints the HTML page instead.
 */
export async function GET(request: Request) {
  if (!(await toolAccess("megagame.manage")))
    return new Response("Sign in required.", { status: 401 });

  const { quests, ids } = await printQuests(new URL(request.url).searchParams);
  if (quests.length === 0)
    return new Response("No quests to print.", { status: 404 });
  const filename =
    ids.length === 1 && quests[0]
      ? `${formatTicketCode(quests[0].code)}.pdf`
      : "quests.pdf";

  try {
    const images = await loadQuestImages(quests);
    const { bytes, overflow } = await createQuestPdf(quests, images);
    // Streamed, which Vercel exempts from its 4.5 MB response cap.
    return new Response(new Blob([new Uint8Array(bytes)]).stream(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        ...(overflow.length > 0 && { [OVERFLOW_HEADER]: overflow.join(",") }),
      },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message.split("\n")[0] : String(e);
    return new Response(`PDF render failed: ${reason}`, { status: 500 });
  }
}
