import { authorize } from "@/lib/admin-api";
import { apiGuideMarkdown } from "@/lib/api-docs";
import { siteOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";

/** The agent guide as markdown. */
export async function GET(request: Request) {
  const access = await authorize("api_docs.view");
  if (access instanceof Response) return access;
  return new Response(apiGuideMarkdown(siteOrigin(request)), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
