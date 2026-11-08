import { toolAccess } from "@/lib/admin-auth";
import { cardBackground } from "@/lib/megagame-quests";
import { listQuests, questsByIds } from "@/lib/megagame-store";
import { createQuestPdf, loadQuestImages } from "@/lib/quest-pdf";
import { formatTicketCode } from "@/lib/ticket-code-format";
import { isUuid } from "../../../megagame/uuid";
import { OVERFLOW_HEADER } from "../overflow";

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

  const params = new URL(request.url).searchParams;
  const ids = [...new Set(params.getAll("id").filter(isUuid))];
  const cls = params.get("class") ?? "";
  const quests =
    ids.length > 0
      ? await questsByIds(ids)
      : (await listQuests()).filter(
          (q) => q.active && (!cls || cardBackground(q) === cls),
        );
  const filename =
    ids.length === 1 && quests[0]
      ? `${formatTicketCode(quests[0].code)}.pdf`
      : "quests.pdf";

  try {
    const images = await loadQuestImages(quests);
    const { bytes, overflow } = await createQuestPdf(quests, images);
    return new Response(new Uint8Array(bytes), {
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
